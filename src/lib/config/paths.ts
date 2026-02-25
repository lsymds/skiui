import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { getAssistantRulePaths, getAssistantSkillPaths } from "../assistants/registry";

export const SKIUI_GLOBAL_CONFIG_DIR_ENV = "SKIUI_GLOBAL_CONFIG_DIR";

const PROJECT_SKILL_PATHS = getAssistantSkillPaths("project");
const PROJECT_RULE_PATHS = getAssistantRulePaths("project");

export const PROJECT_GITIGNORE_LINES = [
  ".skiui/repos",
  ".skiui/skiui.local.json",
  ...PROJECT_SKILL_PATHS,
  ...PROJECT_RULE_PATHS
];

export type ResolvedConfigPaths = {
  globalDir: string;
  globalConfigFile: string;
  projectDir: string;
  projectConfigFile: string;
  localProjectConfigFile: string;
  projectLocalSkillsDir: string;
};

export function resolveGlobalConfigDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[SKIUI_GLOBAL_CONFIG_DIR_ENV]?.trim();
  if (override) {
    return resolve(override);
  }

  return join(homedir(), ".config", "skiui");
}

export function resolveConfigPaths(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): ResolvedConfigPaths {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;

  const globalDir = resolveGlobalConfigDir(env);
  const projectDir = join(cwd, ".skiui");

  return {
    globalDir,
    globalConfigFile: join(globalDir, "skiui.json"),
    projectDir,
    projectConfigFile: join(projectDir, "skiui.json"),
    localProjectConfigFile: join(projectDir, "skiui.local.json"),
    projectLocalSkillsDir: join(projectDir, "local")
  };
}
