import { join } from "node:path";
import { createDefaultAssistantsConfig } from "../assistants/registry";
import { CONFIG_VERSION, type SkiuiConfig } from "./types";

export function createDefaultGlobalConfig(globalDir: string): SkiuiConfig {
  return {
    version: CONFIG_VERSION,
    cachePath: join(globalDir, "repos"),
    assistants: createDefaultAssistantsConfig(),
    repositories: [],
    projects: []
  };
}

export function createDefaultProjectConfig(): SkiuiConfig {
  return {
    version: CONFIG_VERSION,
    cachePath: ".skiui/repos",
    assistants: createDefaultAssistantsConfig(),
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
