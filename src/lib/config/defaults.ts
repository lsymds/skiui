import { join } from "node:path"
import { createDefaultAssistantsConfig } from "../assistants/registry"
import {
	CONFIG_SCHEMA_URL,
	CONFIG_VERSION,
	DEFAULT_GLOBAL_RULES_PATH,
	DEFAULT_PROJECT_RULES_PATH,
	type SkiuiConfig,
} from "./types"

export function createDefaultGlobalConfig(globalDir: string): SkiuiConfig {
	return {
		$schema: CONFIG_SCHEMA_URL,
		version: CONFIG_VERSION,
		cachePath: join(globalDir, "repos"),
		rulesPath: DEFAULT_GLOBAL_RULES_PATH,
		assistants: createDefaultAssistantsConfig(),
		repositories: [],
		projects: [],
	}
}

export function createDefaultProjectConfig(): SkiuiConfig {
	return {
		$schema: CONFIG_SCHEMA_URL,
		version: CONFIG_VERSION,
		cachePath: ".skiui/repos",
		rulesPath: DEFAULT_PROJECT_RULES_PATH,
		assistants: {},
		repositories: [
			{
				name: "local",
				source: {
					type: "fs",
					path: ".skiui/local",
				},
				skills: [],
			},
		],
	}
}

export function createDefaultLocalConfig(
	projectConfig: SkiuiConfig,
): SkiuiConfig {
	return {
		$schema: CONFIG_SCHEMA_URL,
		version: CONFIG_VERSION,
		cachePath: projectConfig.cachePath,
		rulesPath: projectConfig.rulesPath,
		assistants: {},
		repositories: [],
	}
}
