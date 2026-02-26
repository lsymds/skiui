import { afterEach, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import {
	createSkiuiTestEnv,
	createTempPathManager,
} from "../../testing/test-env"
import { initConfig } from "../service"
import { disableAssistant, enableAssistant } from "./index"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("enableAssistant writes to project config by default in project context", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	const result = await enableAssistant({
		assistantId: "claude",
		cwd: projectDir,
		env,
	})

	expect(result.scope).toBe("project")
	expect(result.statusChanged).toBe(true)

	const projectConfig = await readJson<{ assistants: Record<string, string> }>(
		join(projectDir, ".skiui", "skiui.json"),
	)
	expect(projectConfig.assistants.claude).toBe("enabled")

	const secondResult = await enableAssistant({
		assistantId: "claude",
		cwd: projectDir,
		env,
	})
	expect(secondResult.statusChanged).toBe(false)
})

test("enableAssistant creates local config when targeting local scope", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	const result = await enableAssistant({
		assistantId: "opencode",
		scope: "local",
		cwd: projectDir,
		env,
	})

	expect(result.scope).toBe("local")
	expect(result.statusChanged).toBe(true)

	const localConfig = await readJson<{ assistants: Record<string, string> }>(
		join(projectDir, ".skiui", "skiui.local.json"),
	)
	expect(localConfig.assistants.opencode).toBe("enabled")
})

test("disableAssistant writes to global config outside project context", async () => {
	const workingDir = await tempPaths.createTempPath("skiui-work-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: true,
		initProject: false,
		cwd: workingDir,
		env,
	})

	await enableAssistant({
		assistantId: "claude",
		scope: "global",
		cwd: workingDir,
		env,
	})

	const result = await disableAssistant({
		assistantId: "claude",
		scope: "global",
		cwd: workingDir,
		env,
	})

	expect(result.scope).toBe("global")
	expect(result.statusChanged).toBe(true)

	const globalConfig = await readJson<{ assistants: Record<string, string> }>(
		join(globalDir, "skiui.json"),
	)
	expect(globalConfig.assistants.claude).toBe("disabled")
})

test("enableAssistant rejects unsupported assistant id", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-project-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: false,
		initProject: true,
		cwd: projectDir,
		env,
	})

	await expect(
		enableAssistant({
			assistantId: "does-not-exist",
			cwd: projectDir,
			env,
		}),
	).rejects.toThrow("is not supported")
})

test("local scope errors when project config does not exist", async () => {
	const workingDir = await tempPaths.createTempPath("skiui-work-")
	const globalDir = await tempPaths.createTempPath("skiui-global-")
	const env = createSkiuiTestEnv({ globalDir })

	await initConfig({
		initGlobal: true,
		initProject: false,
		cwd: workingDir,
		env,
	})

	await expect(
		enableAssistant({
			assistantId: "claude",
			scope: "local",
			cwd: workingDir,
			env,
		}),
	).rejects.toThrow("No project skiui configuration found")
})

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, "utf8")) as T
}
