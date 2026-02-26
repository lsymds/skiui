import { homedir } from "node:os"
import { dirname } from "node:path"
import { loadConfigLayers } from "../config/layers"
import { mergeConfigLayers } from "../config/merge"
import {
	type AssistantStatus,
	CONFIG_VERSION,
	type SkiuiConfig,
} from "../config/types"
import { type ApplyResult, applyConfiguredSkills } from "../repos/apply"
import { applyRulesForScope } from "../rules/apply"
import { CliError } from "../utils/errors"

export async function applyConfigured(options?: {
	cwd?: string
	env?: NodeJS.ProcessEnv
}): Promise<ApplyResult> {
	const cwd = options?.cwd ?? process.cwd()
	const env = options?.env ?? process.env

	const result = await applyConfiguredSkills({ cwd, env })
	const layers = await loadConfigLayers(cwd, env)

	if (!layers.global.config) {
		throw new CliError("No skiui configuration found. Run `skiui init` first.")
	}

	const rulesLinkedByScope = new Map<"global" | "project", number>()
	const globalDir = dirname(layers.global.configPath)

	rulesLinkedByScope.set(
		"global",
		await applyRulesForScope({
			scope: "global",
			config: layers.global.config,
			assistantRoot: resolveHomeDir(env),
			contextRoot: globalDir,
		}),
	)

	if (layers.project.config) {
		const projectConfig = mergeProjectLocalForRules(
			layers.project.config,
			layers.local.config,
			layers.global.config.assistants,
		)

		rulesLinkedByScope.set(
			"project",
			await applyRulesForScope({
				scope: "project",
				config: projectConfig,
				assistantRoot: cwd,
				contextRoot: cwd,
			}),
		)
	}

	return {
		...result,
		scopes: result.scopes.map((scopeResult) => ({
			...scopeResult,
			rulesLinked: rulesLinkedByScope.get(scopeResult.scope) ?? 0,
		})),
	}
}

function mergeProjectLocalForRules(
	projectConfig: SkiuiConfig,
	localConfig: SkiuiConfig | null,
	globalAssistants: Record<string, AssistantStatus>,
): SkiuiConfig {
	return mergeConfigLayers(
		{
			version: CONFIG_VERSION,
			cachePath: projectConfig.cachePath,
			assistants: globalAssistants,
			repositories: [],
			projects: [],
		},
		projectConfig,
		localConfig,
	)
}

function resolveHomeDir(env: NodeJS.ProcessEnv): string {
	const home = env.HOME?.trim()
	return home && home.length > 0 ? home : homedir()
}
