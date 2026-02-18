import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const SKIUI_GLOBAL_CONFIG_DIR_ENV = "SKIUI_GLOBAL_CONFIG_DIR";

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

  if (process.platform === "win32") {
    return join(homedir(), "AppData", "Roaming", "skiui");
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "skiui");
  }

  const xdgConfigHome = env.XDG_CONFIG_HOME?.trim();
  const baseConfigDir = xdgConfigHome && xdgConfigHome.length > 0 ? xdgConfigHome : join(homedir(), ".config");
  return join(baseConfigDir, "skiui");
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
