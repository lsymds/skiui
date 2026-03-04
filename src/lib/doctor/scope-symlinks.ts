import { homedir } from "node:os"
import type { LoadedLayers } from "../config/layers"
import { mergeConfigLayers } from "../config/merge"
import { CONFIG_VERSION, type SkiuiConfig } from "../config/types"
import type { ConfigScope } from "../projects/types"
import type { DoctorTask } from "./run"
import { buildManagedLinkPlan, pruneManagedSymlinks } from "./symlinks"

export const PRUNE_MANAGED_SYMLINKS_TASK: DoctorTask = {
	id: "prune-managed-symlinks",
	run: async (context) => ({
		actions: await pruneManagedSymlinksForScope(context),
	}),
}

export async function pruneManagedSymlinksForScope(options: {
	scope: ConfigScope
	updatedConfig: SkiuiConfig
	layers: LoadedLayers
	cwd: string
	env: NodeJS.ProcessEnv
}): Promise<number> {
	if (options.scope === "global") {
		const globalPlan = buildManagedLinkPlan({
			scope: "global",
			config: options.updatedConfig,
			assistantRoot: resolveHomeDir(options.env),
		})

		const result = await pruneManagedSymlinks({
			managedDestinations: globalPlan.managedDestinations,
			activeDestinations: globalPlan.activeDestinations,
			cleanupDirectories: globalPlan.managedCleanupDirectories,
		})
		return result.removedCount
	}

	const projectConfig =
		options.scope === "project"
			? options.updatedConfig
			: options.layers.project.config

	if (!projectConfig) {
		return 0
	}

	const localConfig =
		options.scope === "local"
			? options.updatedConfig
			: options.layers.local.config

	const projectEffectiveConfig = mergeConfigLayers(
		{
			version: CONFIG_VERSION,
			cachePath: projectConfig.cachePath,
			assistants: options.layers.global.config?.assistants ?? {},
			repositories: [],
			projects: [],
		},
		projectConfig,
		localConfig,
	)

	const projectPlan = buildManagedLinkPlan({
		scope: "project",
		config: projectEffectiveConfig,
		assistantRoot: options.cwd,
	})

	const result = await pruneManagedSymlinks({
		managedDestinations: projectPlan.managedDestinations,
		activeDestinations: projectPlan.activeDestinations,
		cleanupDirectories: projectPlan.managedCleanupDirectories,
	})

	return result.removedCount
}

function resolveHomeDir(env: NodeJS.ProcessEnv): string {
	const home = env.HOME?.trim()
	if (home && home.length > 0) {
		return home
	}

	return homedir()
}
