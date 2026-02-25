import { join } from "node:path";
import { createDefaultAssistantsConfig } from "../assistants/registry";
import { CONFIG_VERSION, DEFAULT_RULES_PATH, type SkiuiConfig } from "./types";

export function createDefaultGlobalConfig(globalDir: string): SkiuiConfig {
  return {
    version: CONFIG_VERSION,
    cachePath: join(globalDir, "repos"),
    rulesPath: DEFAULT_RULES_PATH,
    assistants: createDefaultAssistantsConfig(),
    repositories: [],
    projects: []
  };
}

export function createDefaultProjectConfig(): SkiuiConfig {
  return {
    version: CONFIG_VERSION,
    cachePath: ".skiui/repos",
    rulesPath: DEFAULT_RULES_PATH,
    assistants: {},
    repositories: [
      {
        name: "local",
        source: {
          type: "fs",
          path: ".skiui/local"
        },
        skills: []
      }
    ]
  };
}
