import type { ConfigScope } from "../../projects/types";
import { cloneRepository } from "../../utils/clone";
import { CliError } from "../../utils/errors";
import { loadConfigLayers } from "../layers";
import { writeConfigFile } from "../store";
import type { RepositoryConfig, SkiuiConfig } from "../types";
import { selectTargetLayer } from "../target-layer";
import {
  allocateRepositoryName,
  inferRepositoryName,
  isSameSource,
  normalizeRepositoryNameInput,
  normalizeSkillName,
  parseRepositorySource,
  validateRepositoryNameInput
} from "./repository-source";

const SCOPE_ORDER: Record<ConfigScope, number> = { global: 0, project: 1, local: 2 };

export type AddRepositoryOptions = {
  repository: string;
  repositoryName?: string;
  scope?: ConfigScope;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type AddRepositoryResult = {
  scope: ConfigScope;
  configPath: string;
  repositoryName: string;
  repositoryAdded: boolean;
};

export type EnableSkillOptions = {
  repositoryName: string;
  skillName: string;
  scope?: ConfigScope;
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
  const layers = await loadConfigLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.scope);

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
  const layers = await loadConfigLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.scope);

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

export async function listEnabledSkills(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ListEnabledSkillsResult> {
  const layers = await loadConfigLayers(options?.cwd, options?.env);

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
      return SCOPE_ORDER[left.scope] - SCOPE_ORDER[right.scope];
    }

    if (left.repositoryName !== right.repositoryName) {
      return left.repositoryName.localeCompare(right.repositoryName);
    }

    return left.skillName.localeCompare(right.skillName);
  });

  return { entries };
}
