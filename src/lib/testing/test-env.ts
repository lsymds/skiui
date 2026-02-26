import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { SKIUI_GLOBAL_CONFIG_DIR_ENV } from "../config/paths"

export type TempPathManager = {
	createTempPath: (prefix: string) => Promise<string>
	cleanup: () => Promise<void>
}

export function createTempPathManager(): TempPathManager {
	const tempPaths: string[] = []

	return {
		async createTempPath(prefix: string): Promise<string> {
			const path = await mkdtemp(join(tmpdir(), prefix))
			tempPaths.push(path)
			return path
		},
		async cleanup(): Promise<void> {
			await Promise.all(
				tempPaths
					.splice(0, tempPaths.length)
					.map((path) => rm(path, { recursive: true, force: true })),
			)
		},
	}
}

export function createSkiuiTestEnv(options: {
	globalDir: string
	homeDir?: string
	baseEnv?: NodeJS.ProcessEnv
	overrides?: NodeJS.ProcessEnv
}): NodeJS.ProcessEnv {
	const baseEnv = options.baseEnv ?? process.env
	const env: NodeJS.ProcessEnv = {
		...baseEnv,
		[SKIUI_GLOBAL_CONFIG_DIR_ENV]: options.globalDir,
	}

	if (options.homeDir) {
		env.HOME = options.homeDir
	}

	if (options.overrides) {
		Object.assign(env, options.overrides)
	}

	return env
}
