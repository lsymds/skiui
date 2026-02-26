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

test("cli skill enable errors when repository name does not exist", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const result = await runCli(["skill", "enable", "missing", "my-skill"], {
		cwd: projectDir,
		env,
	})
	expect(result.exitCode).toBe(1)
	expect(result.stderr).toContain(
		"Repository `missing` was not found in project config",
	)
})
