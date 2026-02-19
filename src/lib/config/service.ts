import { resolve } from "node:path";
import { createDefaultGlobalConfig, createDefaultProjectConfig } from "./defaults";
import { mergeConfigLayers } from "./merge";
import { resolveConfigPaths } from "./paths";
import { loadConfigFile, writeConfigFile } from "./store";
import type { SkiuiConfig } from "./types";
import { getAssistantSkillPaths } from "../assistants/registry";
import { CliError } from "../utils/errors";
import { ensureDirectory, upsertLines } from "../utils/fs";

const PROJECT_GITIGNORE_LINES = [".skiui/repos", ".skiui/skiui.local.json", ...getAssistantSkillPaths("project")];

export type InitConfigOptions = {
  initGlobal: boolean;
  initProject: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type InitConfigResult = {
  globalConfigPath?: string;
  projectConfigPath?: string;
  globalCreated: boolean;
  projectCreated: boolean;
};

export type EffectiveConfigResult = {
  config: SkiuiConfig | null;
  isProjectContext: boolean;
  globalConfigPath: string;
  projectConfigPath: string;
  localProjectConfigPath: string;
};

export async function initConfig(options: InitConfigOptions): Promise<InitConfigResult> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;

  const paths = resolveConfigPaths({ cwd, env });

  let globalCreated = false;
  let projectCreated = false;

  let globalConfig: SkiuiConfig | null = null;
  if (options.initGlobal || options.initProject) {
    const ensureGlobalResult = await ensureGlobalConfig(paths.globalDir, paths.globalConfigFile);
    globalConfig = ensureGlobalResult.config;
    globalCreated = ensureGlobalResult.created;
  }

  if (options.initProject) {
    await ensureDirectory(paths.projectDir);
    await ensureDirectory(paths.projectLocalSkillsDir);

    const existingProjectConfig = await loadConfigFile(paths.projectConfigFile);
    const projectConfig = existingProjectConfig ?? createDefaultProjectConfig();

    if (!existingProjectConfig) {
      await writeConfigFile(paths.projectConfigFile, projectConfig);
      projectCreated = true;
    }

    const gitignorePath = resolve(cwd, ".gitignore");
    await upsertLines(gitignorePath, PROJECT_GITIGNORE_LINES);

    if (!globalConfig) {
      throw new CliError("Global config should be initialized before project registration");
    }

    const updatedGlobalConfig = registerProject(globalConfig, cwd);
    await writeConfigFile(paths.globalConfigFile, updatedGlobalConfig);
  }

  return {
    globalConfigPath: options.initGlobal || options.initProject ? paths.globalConfigFile : undefined,
    projectConfigPath: options.initProject ? paths.projectConfigFile : undefined,
    globalCreated,
    projectCreated
  };
}

export async function loadEffectiveConfig(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<EffectiveConfigResult> {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const paths = resolveConfigPaths({ cwd, env });

  const [globalConfig, projectConfig, localProjectConfig] = await Promise.all([
    loadConfigFile(paths.globalConfigFile),
    loadConfigFile(paths.projectConfigFile),
    loadConfigFile(paths.localProjectConfigFile)
  ]);

  if (!globalConfig) {
    return {
      config: null,
      isProjectContext: false,
      globalConfigPath: paths.globalConfigFile,
      projectConfigPath: paths.projectConfigFile,
      localProjectConfigPath: paths.localProjectConfigFile
    };
  }

  const isProjectContext = projectConfig !== null;
  const config = isProjectContext ? mergeConfigLayers(globalConfig, projectConfig, localProjectConfig) : globalConfig;

  return {
    config,
    isProjectContext,
    globalConfigPath: paths.globalConfigFile,
    projectConfigPath: paths.projectConfigFile,
    localProjectConfigPath: paths.localProjectConfigFile
  };
}

async function ensureGlobalConfig(globalDir: string, globalConfigFile: string): Promise<{
  config: SkiuiConfig;
  created: boolean;
}> {
  await ensureDirectory(globalDir);

  const existing = await loadConfigFile(globalConfigFile);
  if (existing) {
    return {
      config: existing,
      created: false
    };
  }

  const config = createDefaultGlobalConfig(globalDir);
  await writeConfigFile(globalConfigFile, config);

  return {
    config,
    created: true
  };
}

function registerProject(globalConfig: SkiuiConfig, cwd: string): SkiuiConfig {
  const projectPath = resolve(cwd);
  const projects = globalConfig.projects ?? [];

  if (projects.some((project) => project.path === projectPath)) {
    return globalConfig;
  }

  return {
    ...globalConfig,
    projects: [
      ...projects,
      {
        path: projectPath
      }
    ]
  };
}
