import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { loadConfigLayers } from "../config/layers";
import { mergeConfigLayers } from "../config/merge";
import { PROJECT_GITIGNORE_LINES } from "../config/paths";
import { writeConfigFile } from "../config/store";
import { CONFIG_VERSION, type RepositoryConfig, type SkiuiConfig, type SkillConfig } from "../config/types";
import { ASSISTANT_DEFINITIONS, getAssistantSkillPathsForScope } from "../assistants/registry";
import { CliError } from "../utils/errors";
import { ensureDirectory, makeSymlink, upsertLines } from "../utils/fs";
import { discoverSkills } from "./skill-discovery";
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
  rulesLinked: number;
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

export async function applyConfiguredSkills(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ApplyResult> {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const layers = await loadConfigLayers(cwd, env);

  if (!layers.global.config) {
    throw new CliError("No skiui configuration found. Run `skiui init` first.");
  }

  const scopes: ApplyScopeResult[] = [];
  const missingSkills: MissingSkill[] = [];

  const globalDir = dirname(layers.global.configPath);

  const globalScope = await syncConfigScope({
    scope: "global",
    config: layers.global.config,
    configPath: layers.global.configPath,
    contextRoot: globalDir
  });

  const globalApply = await applyScopeSkills({
    scope: globalScope,
    assistantRoot: resolveHomeDir(env)
  });

  scopes.push(globalApply.result);
  missingSkills.push(...globalApply.missingSkills);

  if (layers.project.config) {
    const projectScope = await syncConfigScope({
      scope: "project",
      config: layers.project.config,
      configPath: layers.project.configPath,
      contextRoot: cwd
    });

    let projectEffectiveConfig = projectScope.config;
    let projectCatalogs = projectScope.catalogsByRepository;

    if (layers.local.config) {
      const localScope = await syncConfigScope({
        scope: "project",
        config: layers.local.config,
        configPath: layers.local.configPath,
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
  const rulesLinked = 0;

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
      const linkedDestinations = new Set<string>();

      for (const assistant of enabledAssistants) {
        for (const assistantPath of getAssistantSkillPathsForScope(assistant, options.scope.scope)) {
          const destinationBase = isAbsolute(assistantPath)
            ? assistantPath
            : join(options.assistantRoot, assistantPath);
          const destinationPath = join(destinationBase, ...skill.path.split("/"));
          const destinationKey = resolve(destinationPath);

          if (linkedDestinations.has(destinationKey)) {
            continue;
          }

          linkedDestinations.add(destinationKey);
          assertLinkPathsDoNotOverlap({
            sourcePath,
            destinationPath,
            context: `skill \`${skill.path}\` from repository \`${repository.name}\` to assistant \`${assistant.id}\``
          });
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
      skillsLinked,
      rulesLinked
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

function assertLinkPathsDoNotOverlap(options: {
  sourcePath: string;
  destinationPath: string;
  context: string;
}): void {
  const source = resolve(options.sourcePath);
  const destination = resolve(options.destinationPath);

  if (source === destination || isDescendantPath(source, destination) || isDescendantPath(destination, source)) {
    throw new CliError(`Cannot link ${options.context} because source and destination paths overlap: ${source} <-> ${destination}`);
  }
}

function isDescendantPath(path: string, candidateAncestor: string): boolean {
  const relativePath = relative(candidateAncestor, path);
  return relativePath.length > 0 && !relativePath.startsWith("..") && relativePath !== ".";
}
