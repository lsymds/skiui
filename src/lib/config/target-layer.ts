import type { ConfigScope } from "../projects/types"
import { CliError } from "../utils/errors"
import { createDefaultLocalConfig } from "./defaults"
import type { LoadedLayers } from "./layers"
import type { SkiuiConfig } from "./types"

export type TargetLayer = {
	scope: ConfigScope
	configPath: string
	config: SkiuiConfig
}

export function selectTargetLayer(
	layers: LoadedLayers,
	scope: ConfigScope | undefined,
): TargetLayer {
	if (scope === "global") {
		if (!layers.global.config) {
			throw new CliError(
				"No global skiui configuration found. Run `skiui init --scope global` first.",
			)
		}

		return {
			scope: "global",
			configPath: layers.global.configPath,
			config: layers.global.config,
		}
	}

	if (scope === "project") {
		if (!layers.project.config) {
			throw new CliError(
				"No project skiui configuration found. Run `skiui init` first.",
			)
		}

		return {
			scope: "project",
			configPath: layers.project.configPath,
			config: layers.project.config,
		}
	}

	if (scope === "local") {
		if (!layers.project.config) {
			throw new CliError(
				"No project skiui configuration found. Run `skiui init` first.",
			)
		}

		return {
			scope: "local",
			configPath: layers.local.configPath,
			config:
				layers.local.config ?? createDefaultLocalConfig(layers.project.config),
		}
	}

	if (layers.project.config) {
		return {
			scope: "project",
			configPath: layers.project.configPath,
			config: layers.project.config,
		}
	}

	if (layers.global.config) {
		return {
			scope: "global",
			configPath: layers.global.configPath,
			config: layers.global.config,
		}
	}

	throw new CliError("No skiui configuration found. Run `skiui init` first.")
}
