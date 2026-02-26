import { afterEach, expect, test } from "bun:test"
import {
	createSkiuiTestEnv,
	createTempPathManager,
} from "../../../lib/testing/test-env"
import { runCli } from "../test-utils"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("cli agent enable rejects unsupported assistant id", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const result = await runCli(["agent", "enable", "unknown-assistant"], {
		cwd: projectDir,
		env,
	})
	expect(result.exitCode).toBe(1)
	expect(result.stderr).toContain("is not supported")
})

test("cli agent enable can write to local scope", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const enableResult = await runCli(
		["agent", "enable", "claude", "--scope", "local"],
		{ cwd: projectDir, env },
	)
	expect(enableResult.exitCode).toBe(0)
	expect(enableResult.stdout).toContain("Updated local config")

	const configResult = await runCli(["config"], { cwd: projectDir, env })
	expect(configResult.exitCode).toBe(0)
	const parsed = JSON.parse(configResult.stdout) as {
		assistants: Record<string, string>
	}
	expect(parsed.assistants.claude).toBe("enabled")
})
