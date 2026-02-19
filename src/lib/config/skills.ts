import { basename, normalize } from "node:path";
import type { ConfigScope } from "../projects/types";
import { CliError } from "../utils/errors";
import { resolveConfigPaths } from "./paths";
import { loadConfigFile, writeConfigFile } from "./store";
import type { RepositoryConfig, SkiuiConfig, SkillConfig } from "./types";

type LoadedLayers = {
  global: {
    configPath: string;
    config: SkiuiConfig | null;
  };
  project: {
    configPath: string;
    config: SkiuiConfig | null;
  };
  local: {
    configPath: string;
    config: SkiuiConfig | null;
  };
};

type TargetLayer = {
  scope: ConfigScope;
  configPath: string;
  config: SkiuiConfig;
};

export type AddSkillOptions = {
  sourceType: "git" | "fs";
  skillName: string;
  repositoryUrl?: string;
  sourcePath?: string;
  global: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type AddRepositoryOptions = {
  repository: string;
  repositoryName?: string;
  global: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type AddRepositoryResult = {
  scope: ConfigScope;
  configPath: string;
  repositoryName: string;
  repositoryAdded: boolean;
};

export type AddSkillResult = {
  scope: ConfigScope;
  configPath: string;
  repositoryName: string;
  repositoryAdded: boolean;
  skillAdded: boolean;
};

export type EnableSkillOptions = {
  repositoryName: string;
  skillName: string;
  global: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type EnableSkillResult = {
  scope: ConfigScope;
  configPath: string;
  repositoryName: string;
  skillAdded: boolean;
  skillEnabled: boolean;
};

export type EnabledSkillListEntry = {
  scope: ConfigScope;
  repositoryName: string;
  sourceType: "git" | "fs";
  skillName: string;
  skillPath: string;
};

export type ListEnabledSkillsResult = {
  entries: EnabledSkillListEntry[];
};

export async function addRepository(options: AddRepositoryOptions): Promise<AddRepositoryResult> {
  const layers = await loadLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.global);

  const source = parseRepositorySource(options.repository);
  const requestedRepositoryName = options.repositoryName ? validateRepositoryNameInput(options.repositoryName) : undefined;
  const repositories = target.config.repositories.map(cloneRepository);

  let repository = repositories.find((candidate) => isSameSource(candidate, source));
  let repositoryAdded = false;

  if (repository) {
    if (requestedRepositoryName && repository.name !== requestedRepositoryName) {
      throw new CliError(
        `Repository source already exists as \`${repository.name}\` in ${target.scope} config; requested name was \`${requestedRepositoryName}\``
      );
    }

    return {
      scope: target.scope,
      configPath: target.configPath,
      repositoryName: repository.name,
      repositoryAdded
    };
  }

  if (requestedRepositoryName) {
    const conflictingRepository = repositories.find((candidate) => candidate.name === requestedRepositoryName);
    if (conflictingRepository) {
      throw new CliError(
        `Repository name \`${requestedRepositoryName}\` already exists in ${target.scope} config with a different source`
      );
    }
  }

  repository = {
    name: requestedRepositoryName ?? allocateRepositoryName(inferRepositoryName(source), repositories),
    source,
    skills: []
  };

  repositories.push(repository);
  repositoryAdded = true;

  const updatedConfig: SkiuiConfig = {
    ...target.config,
    repositories
  };
  await writeConfigFile(target.configPath, updatedConfig);

  return {
    scope: target.scope,
    configPath: target.configPath,
    repositoryName: repository.name,
    repositoryAdded
  };
}

export async function enableSkill(options: EnableSkillOptions): Promise<EnableSkillResult> {
  const layers = await loadLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.global);

  const repositoryName = normalizeRepositoryNameInput(options.repositoryName);
  const skillName = normalizeSkillName(options.skillName);

  const repositories = target.config.repositories.map(cloneRepository);
  const repository = repositories.find((candidate) => candidate.name === repositoryName);

  if (!repository) {
    throw new CliError(`Repository \`${repositoryName}\` was not found in ${target.scope} config`);
  }

  const existingSkill = repository.skills.find((skill) => skill.path === skillName || skill.name === skillName);

  let skillAdded = false;
  let skillEnabled = false;

  if (!existingSkill) {
    repository.skills.push({
      path: skillName,
      name: skillName,
      enabled: true
    });
    skillAdded = true;
  } else if (!existingSkill.enabled) {
    existingSkill.enabled = true;
    skillEnabled = true;
  }

  if (skillAdded || skillEnabled) {
    const updatedConfig: SkiuiConfig = {
      ...target.config,
      repositories
    };

    await writeConfigFile(target.configPath, updatedConfig);
  }

  return {
    scope: target.scope,
    configPath: target.configPath,
    repositoryName: repository.name,
    skillAdded,
    skillEnabled
  };
}

export async function addSkill(options: AddSkillOptions): Promise<AddSkillResult> {
  const layers = await loadLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.global);

  const source = buildSource(options);
  const repositories = target.config.repositories.map(cloneRepository);

  let repository = repositories.find((candidate) => isSameSource(candidate, source));
  let repositoryAdded = false;

  if (!repository) {
    repository = {
      name: allocateRepositoryName(inferRepositoryName(source), repositories),
      source,
      skills: []
    };

    repositories.push(repository);
    repositoryAdded = true;
  }

  const hasSkill = repository.skills.some((skill) => skill.path === options.skillName || skill.name === options.skillName);
  let skillAdded = false;

  if (!hasSkill) {
    repository.skills.push({
      path: options.skillName,
      name: options.skillName,
      enabled: true
    });
    skillAdded = true;
  }

  if (repositoryAdded || skillAdded) {
    const updatedConfig: SkiuiConfig = {
      ...target.config,
      repositories
    };
    await writeConfigFile(target.configPath, updatedConfig);
  }

  return {
    scope: target.scope,
    configPath: target.configPath,
    repositoryName: repository.name,
    repositoryAdded,
    skillAdded
  };
}

export async function listEnabledSkills(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ListEnabledSkillsResult> {
  const layers = await loadLayers(options?.cwd, options?.env);

  if (!layers.global.config) {
    throw new CliError("No skiui configuration found. Run `skiui init` first.");
  }

  const scopeLayers: Array<{ scope: ConfigScope; config: SkiuiConfig | null }> = [
    { scope: "global", config: layers.global.config }
  ];

  if (layers.project.config) {
    scopeLayers.push({ scope: "project", config: layers.project.config });
    scopeLayers.push({ scope: "local", config: layers.local.config });
  }

  const entries: EnabledSkillListEntry[] = [];

  for (const scopeLayer of scopeLayers) {
    if (!scopeLayer.config) {
      continue;
    }

    for (const repository of scopeLayer.config.repositories) {
      for (const skill of repository.skills) {
        if (!skill.enabled) {
          continue;
        }

        entries.push({
          scope: scopeLayer.scope,
          repositoryName: repository.name,
          sourceType: repository.source.type,
          skillName: skill.name,
          skillPath: skill.path
        });
      }
    }
  }

  entries.sort((left, right) => {
    if (left.scope !== right.scope) {
      return scopeOrder(left.scope) - scopeOrder(right.scope);
    }

    if (left.repositoryName !== right.repositoryName) {
      return left.repositoryName.localeCompare(right.repositoryName);
    }

    return left.skillName.localeCompare(right.skillName);
  });

  return { entries };
}

function selectTargetLayer(layers: LoadedLayers, writeToGlobal: boolean): TargetLayer {
  if (writeToGlobal) {
    if (!layers.global.config) {
      throw new CliError("No global skiui configuration found. Run `skiui init --global` first.");
    }

    return {
      scope: "global",
      configPath: layers.global.configPath,
      config: layers.global.config
    };
  }

  if (layers.project.config) {
    return {
      scope: "project",
      configPath: layers.project.configPath,
      config: layers.project.config
    };
  }

  if (layers.global.config) {
    return {
      scope: "global",
      configPath: layers.global.configPath,
      config: layers.global.config
    };
  }

  throw new CliError("No skiui configuration found. Run `skiui init` first.");
}

function buildSource(options: AddSkillOptions): RepositoryConfig["source"] {
  if (options.sourceType === "git") {
    if (!options.repositoryUrl) {
      throw new CliError("--repository is required for git sources");
    }

    return {
      type: "git",
      url: normalizeGitUrl(options.repositoryUrl)
    };
  }

  if (!options.sourcePath) {
    throw new CliError("--path is required for fs sources");
  }

  return {
    type: "fs",
    path: normalizeFsPath(options.sourcePath)
  };
}

function parseRepositorySource(repository: string): RepositoryConfig["source"] {
  const value = repository.trim();

  if (value.length === 0) {
    throw new CliError("Repository is required");
  }

  if (looksLikeGitSource(value)) {
    return {
      type: "git",
      url: normalizeGitUrl(value)
    };
  }

  return {
    type: "fs",
    path: normalizeFsPath(value)
  };
}

function looksLikeGitSource(source: string): boolean {
  if (/^(https?:\/\/|ssh:\/\/|git:\/\/)/i.test(source)) {
    return true;
  }

  return /^[^@\s]+@[^:\s]+:.+$/.test(source);
}

function normalizeRepositoryNameInput(repositoryName: string): string {
  const normalized = repositoryName.trim();

  if (normalized.length === 0) {
    throw new CliError("Repository name is required");
  }

  return normalized;
}

function validateRepositoryNameInput(repositoryName: string): string {
  const normalized = repositoryName.trim();

  if (normalized.length === 0) {
    throw new CliError("Repository name is required");
  }

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new CliError("Repository name must contain only lowercase letters, numbers, '.', '_' or '-'");
  }

  return normalized;
}

function normalizeSkillName(skillName: string): string {
  const normalized = skillName.trim();

  if (normalized.length === 0) {
    throw new CliError("Skill name is required");
  }

  return normalized;
}

function isSameSource(repository: RepositoryConfig, source: RepositoryConfig["source"]): boolean {
  if (source.type === "git" && repository.source.type === "git") {
    return normalizeGitUrl(repository.source.url) === normalizeGitUrl(source.url);
  }

  if (source.type === "fs" && repository.source.type === "fs") {
    return normalizeFsPath(repository.source.path) === normalizeFsPath(source.path);
  }

  return false;
}

function cloneRepository(repository: RepositoryConfig): RepositoryConfig {
  return {
    ...repository,
    source: { ...repository.source },
    skills: repository.skills.map(cloneSkill)
  };
}

function cloneSkill(skill: SkillConfig): SkillConfig {
  return {
    ...skill
  };
}

function inferRepositoryName(source: RepositoryConfig["source"]): string {
  if (source.type === "git") {
    const sourceText = normalizeGitUrl(source.url);
    const colonSplit = sourceText.includes(":") ? sourceText.split(":") : [sourceText];
    const finalSegment = colonSplit[colonSplit.length - 1] ?? sourceText;
    const slashSegments = finalSegment.split("/").filter((segment) => segment.length > 0);
    const lastSegment = slashSegments[slashSegments.length - 1] ?? "repository";
    return sanitizeRepositoryName(lastSegment);
  }

  const sourceText = normalizeFsPath(source.path);
  return sanitizeRepositoryName(basename(sourceText) || "repository");
}

function normalizeGitUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
}

function normalizeFsPath(path: string): string {
  const trimmed = path.trim();
  const withoutTrailingSlash = trimmed.replace(/[\\/]+$/, "");
  const normalized = normalize(withoutTrailingSlash.length > 0 ? withoutTrailingSlash : trimmed);
  return normalized.replace(/\\/g, "/");
}

function sanitizeRepositoryName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return sanitized.length > 0 ? sanitized : "repository";
}

function allocateRepositoryName(baseName: string, repositories: RepositoryConfig[]): string {
  if (!repositories.some((repository) => repository.name === baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}-${suffix}`;

  while (repositories.some((repository) => repository.name === candidate)) {
    suffix += 1;
    candidate = `${baseName}-${suffix}`;
  }

  return candidate;
}

async function loadLayers(cwd?: string, env?: NodeJS.ProcessEnv): Promise<LoadedLayers> {
  const paths = resolveConfigPaths({ cwd, env });

  const [globalConfig, projectConfig, localConfig] = await Promise.all([
    loadConfigFile(paths.globalConfigFile),
    loadConfigFile(paths.projectConfigFile),
    loadConfigFile(paths.localProjectConfigFile)
  ]);

  return {
    global: {
      configPath: paths.globalConfigFile,
      config: globalConfig
    },
    project: {
      configPath: paths.projectConfigFile,
      config: projectConfig
    },
    local: {
      configPath: paths.localProjectConfigFile,
      config: localConfig
    }
  };
}

function scopeOrder(scope: ConfigScope): number {
  if (scope === "global") {
    return 0;
  }

  if (scope === "project") {
    return 1;
  }

  return 2;
}
