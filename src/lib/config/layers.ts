import type { ConfigScope } from "../projects/types";
import { resolveConfigPaths } from "./paths";
import { loadConfigFile } from "./store";
import type { SkiuiConfig } from "./types";

export type ConfigLayer = {
  scope: ConfigScope;
  configPath: string;
  config: SkiuiConfig | null;
};

export type LoadedLayers = {
  global: ConfigLayer;
  project: ConfigLayer;
  local: ConfigLayer;
};

export async function loadConfigLayers(cwd?: string, env?: NodeJS.ProcessEnv): Promise<LoadedLayers> {
  const paths = resolveConfigPaths({ cwd, env });

  const [globalConfig, projectConfig, localConfig] = await Promise.all([
    loadConfigFile(paths.globalConfigFile),
    loadConfigFile(paths.projectConfigFile),
    loadConfigFile(paths.localProjectConfigFile)
  ]);

  return {
    global: {
      scope: "global",
      configPath: paths.globalConfigFile,
      config: globalConfig
    },
    project: {
      scope: "project",
      configPath: paths.projectConfigFile,
      config: projectConfig
    },
    local: {
      scope: "local",
      configPath: paths.localProjectConfigFile,
      config: localConfig
    }
  };
}
