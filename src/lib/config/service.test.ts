import { afterEach, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { createSkiuiTestEnv, createTempPathManager } from "../testing/test-env"
import { pathExists } from "../utils/fs"
import { createDefaultProjectConfig } from "./defaults"
import { resolveConfigPaths } from "./paths"
import { initConfig, loadEffectiveConfig } from "./service"
import { writeConfigFile } from "./store"
import { DEFAULT_GLOBAL_RULES_PATH, DEFAULT_PROJECT_RULES_PATH } from "./types"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("initConfig creates project and global files and registers project", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	const paths = resolveConfigPaths({ cwd: projectDir, env })

	const globalConfigContents = await readFile(paths.globalConfigFile, "utf8")
	const globalConfig = JSON.parse(globalConfigContents) as {
		projects: Array<{ path: string }>
		rulesPath: string
	}

	expect(
		globalConfig.projects.some((project) => project.path === projectDir),
	).toBe(true)
	expect(globalConfig.rulesPath).toBe(DEFAULT_GLOBAL_RULES_PATH)

	const projectConfigContents = await readFile(paths.projectConfigFile, "utf8")
	const projectConfig = JSON.parse(projectConfigContents) as {
		repositories: Array<{ name: string }>
		rulesPath: string
	}

	expect(
		projectConfig.repositories.some(
			(repository) => repository.name === "local",
		),
	).toBe(true)
	expect(projectConfig.rulesPath).toBe(DEFAULT_PROJECT_RULES_PATH)
	expect(await pathExists(join(projectDir, ".gitignore"))).toBe(false)

	const rulesContents = await readFile(
		join(projectDir, ".skiui", "AGENTS.md"),
		"utf8",
	)
	expect(rulesContents).toBe("")

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	const dedupedGlobalConfigContents = await readFile(
		paths.globalConfigFile,
		"utf8",
	)
	const dedupedGlobalConfig = JSON.parse(dedupedGlobalConfigContents) as {
		projects: Array<{ path: string }>
	}
	expect(
		dedupedGlobalConfig.projects.filter(
			(project) => project.path === projectDir,
		),
	).toHaveLength(1)
	expect(await pathExists(join(projectDir, ".gitignore"))).toBe(false)
})

test("initConfig does not write .gitignore", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	expect(await pathExists(join(projectDir, ".gitignore"))).toBe(false)
})

test("loadEffectiveConfig returns merged config in project context", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	const paths = resolveConfigPaths({ cwd: projectDir, env })

	const localConfig = createDefaultProjectConfig()
	localConfig.cachePath = ".skiui/local-cache"
	localConfig.assistants.opencode = "enabled"
	await writeConfigFile(paths.localProjectConfigFile, localConfig)

	const result = await loadEffectiveConfig({ cwd: projectDir, env })

	expect(result.isProjectContext).toBe(true)
	expect(result.config).not.toBeNull()
	expect(result.config?.cachePath).toBe(".skiui/local-cache")
	expect(result.config?.assistants.opencode).toBe("enabled")
})
