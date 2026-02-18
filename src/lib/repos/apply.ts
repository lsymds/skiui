import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { mergeConfigLayers } from "../config/merge";
import { resolveConfigPaths } from "../config/paths";
import { loadConfigFile, writeConfigFile } from "../config/store";
import { CONFIG_VERSION, type RepositoryConfig, type SkiuiConfig, type SkillConfig } from "../config/types";
import { ASSISTANT_DEFINITIONS } from "../assistants/registry";
import { CliError } from "../utils/errors";
import { ensureDirectory, makeSymlink, pathExists, upsertLines } from "../utils/fs";
import { syncRepositoryToCache } from "./sync";

type ScopeName = "global" | "project";

export type MissingSkill = {
  scope: ScopeName;
  repositoryName: string;
  skillPath: string;
};

export type ApplyScopeResult = {
  scope: ScopeName;
  repositoriesSynced: number;
  skillsLinked: number;
};

export type ApplyResult = {
  scopes: ApplyScopeResult[];
  missingSkills: MissingSkill[];
};

type RepositoryCatalog = {
  repository: RepositoryConfig;
  discoveredSkillPaths: Set<string>;
  sourceSkillBasePath: string;
};

type ScopeCatalog = {
  scope: ScopeName;
  config: SkiuiConfig;
  catalogsByRepository: Map<string, RepositoryCatalog>;
};

const PROJECT_GITIGNORE_LINES = [
  ".skiui/repos",
  ".skiui/skiui.local.json",
  ...new Set(ASSISTANT_DEFINITIONS.flatMap((assistant) => assistant.skillPaths))
];

export async function applyConfiguredSkills(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ApplyResult> {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const paths = resolveConfigPaths({ cwd, env });

  const [globalConfig, projectConfig, localConfig] = await Promise.all([
    loadConfigFile(paths.globalConfigFile),
    loadConfigFile(paths.projectConfigFile),
    loadConfigFile(paths.localProjectConfigFile)
  ]);

  if (!globalConfig) {
    throw new CliError("No skiui configuration found. Run `skiui init` first.");
  }

  const scopes: ApplyScopeResult[] = [];
  const missingSkills: MissingSkill[] = [];

  const globalScope = await syncConfigScope({
    scope: "global",
    config: globalConfig,
    configPath: paths.globalConfigFile,
    contextRoot: paths.globalDir
  });

  const globalApply = await applyScopeSkills({
    scope: globalScope,
    assistantRoot: resolveHomeDir(env)
  });

  scopes.push(globalApply.result);
  missingSkills.push(...globalApply.missingSkills);

  if (projectConfig) {
    const projectScope = await syncConfigScope({
      scope: "project",
      config: projectConfig,
      configPath: paths.projectConfigFile,
      contextRoot: cwd
    });

    let projectEffectiveConfig = projectScope.config;
    let projectCatalogs = projectScope.catalogsByRepository;

    if (localConfig) {
      const localScope = await syncConfigScope({
        scope: "project",
        config: localConfig,
        configPath: paths.localProjectConfigFile,
        contextRoot: cwd
      });

      projectEffectiveConfig = mergeProjectLocal(projectScope.config, localScope.config);
      projectCatalogs = mergeCatalogMaps(projectScope.catalogsByRepository, localScope.catalogsByRepository);
    }

    const projectApply = await applyScopeSkills({
      scope: {
        scope: "project",
        config: projectEffectiveConfig,
        catalogsByRepository: projectCatalogs
      },
      assistantRoot: cwd
    });

    await upsertLines(join(cwd, ".gitignore"), PROJECT_GITIGNORE_LINES);

    scopes.push(projectApply.result);
    missingSkills.push(...projectApply.missingSkills);
  }

  return {
    scopes,
    missingSkills
  };
}

async function syncConfigScope(options: {
  scope: ScopeName;
  config: SkiuiConfig;
  configPath: string;
  contextRoot: string;
}): Promise<ScopeCatalog> {
  const now = new Date().toISOString();
  const cacheRoot = isAbsolute(options.config.cachePath)
    ? options.config.cachePath
    : resolve(options.contextRoot, options.config.cachePath);

  await ensureDirectory(cacheRoot);

  const updatedRepositories: RepositoryConfig[] = [];
  const catalogsByRepository = new Map<string, RepositoryCatalog>();

  for (const repository of options.config.repositories) {
    const cacheRepositoryPath = join(cacheRoot, repository.name);
    const synced = await syncRepositoryToCache({
      repository,
      contextRoot: options.contextRoot,
      cacheRepositoryPath
    });

    const discoveredSkills = await discoverSkills(synced.skillRootPath);
    const discoveredByPath = new Map(discoveredSkills.map((skill) => [skill.path, skill]));

    const mergedSkills = mergeRepositorySkills(repository.skills, discoveredByPath);

    const updatedRepository: RepositoryConfig = {
      ...repository,
      skills: mergedSkills,
      lastFetched: now,
      lastRefreshed: now
    };

    updatedRepositories.push(updatedRepository);
    catalogsByRepository.set(updatedRepository.name, {
      repository: updatedRepository,
      discoveredSkillPaths: new Set(discoveredByPath.keys()),
      sourceSkillBasePath: synced.skillRootPath
    });
  }

  const updatedConfig: SkiuiConfig = {
    ...options.config,
    repositories: updatedRepositories
  };

  await writeConfigFile(options.configPath, updatedConfig);

  return {
    scope: options.scope,
    config: updatedConfig,
    catalogsByRepository
  };
}

async function applyScopeSkills(options: {
  scope: ScopeCatalog;
  assistantRoot: string;
}): Promise<{ result: ApplyScopeResult; missingSkills: MissingSkill[] }> {
  const enabledAssistants = ASSISTANT_DEFINITIONS.filter(
    (assistant) => options.scope.config.assistants[assistant.id] === "enabled"
  );

  const missingSkills: MissingSkill[] = [];
  let skillsLinked = 0;

  for (const repository of options.scope.config.repositories) {
    const catalog = options.scope.catalogsByRepository.get(repository.name);

    if (!catalog) {
      continue;
    }

    for (const skill of repository.skills) {
      if (!skill.enabled) {
        continue;
      }

      if (!catalog.discoveredSkillPaths.has(skill.path)) {
        missingSkills.push({
          scope: options.scope.scope,
          repositoryName: repository.name,
          skillPath: skill.path
        });
        continue;
      }

      const sourcePath = join(catalog.sourceSkillBasePath, ...skill.path.split("/"));

      for (const assistant of enabledAssistants) {
        for (const assistantPath of assistant.skillPaths) {
          const destinationPath = join(options.assistantRoot, assistantPath, ...skill.path.split("/"));
          await makeSymlink(sourcePath, destinationPath);
          skillsLinked += 1;
        }
      }
    }
  }

  return {
    result: {
      scope: options.scope.scope,
      repositoriesSynced: options.scope.config.repositories.length,
      skillsLinked
    },
    missingSkills
  };
}

function mergeRepositorySkills(
  configuredSkills: SkillConfig[],
  discoveredSkillsByPath: Map<string, { path: string; name: string; description?: string }>
): SkillConfig[] {
  const configuredByPath = new Map(configuredSkills.map((skill) => [skill.path, { ...skill }]));
  const merged: SkillConfig[] = [];

  for (const discoveredSkill of discoveredSkillsByPath.values()) {
    const existing = configuredByPath.get(discoveredSkill.path);

    if (existing) {
      merged.push({
        ...existing,
        name: discoveredSkill.name,
        description: discoveredSkill.description
      });
      configuredByPath.delete(discoveredSkill.path);
      continue;
    }

    merged.push({
      path: discoveredSkill.path,
      name: discoveredSkill.name,
      description: discoveredSkill.description,
      enabled: false
    });
  }

  for (const remaining of configuredByPath.values()) {
    merged.push(remaining);
  }

  return merged;
}

async function discoverSkills(skillRootPath: string): Promise<Array<{ path: string; name: string; description?: string }>> {
  if (!(await pathExists(skillRootPath))) {
    return [];
  }

  const skillFiles: string[] = [];
  await collectSkillFiles(skillRootPath, skillFiles);

  const skills: Array<{ path: string; name: string; description?: string }> = [];

  for (const skillFile of skillFiles) {
    const skillDirectory = dirname(skillFile);
    const relativeDirectory = toConfigPath(relative(skillRootPath, skillDirectory));

    if (relativeDirectory.length === 0) {
      continue;
    }

    const metadata = await parseSkillMetadata(skillFile, relativeDirectory);
    skills.push({
      path: relativeDirectory,
      name: metadata.name,
      description: metadata.description
    });
  }

  skills.sort((left, right) => left.path.localeCompare(right.path));
  return skills;
}

async function collectSkillFiles(directory: string, files: string[]): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectSkillFiles(entryPath, files);
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(entryPath);
    }
  }
}

async function parseSkillMetadata(skillFilePath: string, fallbackName: string): Promise<{ name: string; description?: string }> {
  const contents = await readFile(skillFilePath, "utf8");
  const frontmatter = extractFrontmatter(contents);
  const body = frontmatter ? contents.slice(frontmatter.blockLength) : contents;

  const headingMatch = body.match(/^#\s+(.+)$/m);
  const name = headingMatch?.[1]?.trim() || frontmatter?.metadata.name || fallbackName;

  const description = frontmatter?.metadata.description ?? findFirstDescriptionLine(body);

  return {
    name,
    description
  };
}

function extractFrontmatter(contents: string): {
  metadata: { name?: string; description?: string };
  blockLength: number;
} | null {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match || !match[0] || match[1] === undefined) {
    return null;
  }

  const metadata = parseSimpleFrontmatter(match[1]);

  return {
    metadata,
    blockLength: match[0].length
  };
}

function parseSimpleFrontmatter(frontmatter: string): { name?: string; description?: string } {
  const metadata: { name?: string; description?: string } = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const key = match[1]?.toLowerCase();
    const rawValue = match[2];
    if (!key || !rawValue) {
      continue;
    }

    const value = trimQuotedValue(rawValue);

    if (key === "name") {
      metadata.name = value;
    }

    if (key === "description") {
      metadata.description = value;
    }
  }

  return metadata;
}

function trimQuotedValue(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function findFirstDescriptionLine(contents: string): string | undefined {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    return line;
  }

  return undefined;
}

function mergeProjectLocal(projectConfig: SkiuiConfig, localConfig: SkiuiConfig): SkiuiConfig {
  return mergeConfigLayers(
    {
      version: CONFIG_VERSION,
      cachePath: projectConfig.cachePath,
      assistants: {},
      repositories: [],
      projects: []
    },
    projectConfig,
    localConfig
  );
}

function mergeCatalogMaps(
  baseMap: Map<string, RepositoryCatalog>,
  overrideMap: Map<string, RepositoryCatalog>
): Map<string, RepositoryCatalog> {
  const merged = new Map<string, RepositoryCatalog>(baseMap);

  for (const [repositoryName, catalog] of overrideMap.entries()) {
    merged.set(repositoryName, catalog);
  }

  return merged;
}

function resolveHomeDir(env: NodeJS.ProcessEnv): string {
  const home = env.HOME?.trim();
  if (home) {
    return home;
  }

  return homedir();
}

function toConfigPath(path: string): string {
  if (path.length === 0) {
    return path;
  }

  return path.split("\\").join("/");
}
