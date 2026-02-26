import { afterEach, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { CONFIG_SCHEMA_URL } from "../../../lib/config/types"
import {
	createSkiuiTestEnv,
	createTempPathManager,
} from "../../../lib/testing/test-env"
import { fileExists, runCli } from "../test-utils"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

async function readSchemaFromConfig(
	filePath: string,
): Promise<string | undefined> {
	const configContents = await readFile(filePath, "utf8")
	const parsed = JSON.parse(configContents) as { $schema?: string }
	return parsed.$schema
}

test("cli init defaults to project scope", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")

	const result = await runCli(["init"], {
		cwd: projectDir,
		env: createSkiuiTestEnv({ globalDir }),
	})

	expect(result.exitCode).toBe(0)
	expect(result.stdout).toContain(
		"Initialized project and global configuration",
	)
	expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(true)
	expect(await fileExists(join(projectDir, ".skiui", "AGENTS.md"))).toBe(true)
	expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true)
	expect(
		await readSchemaFromConfig(join(projectDir, ".skiui", "skiui.json")),
	).toBe(CONFIG_SCHEMA_URL)
	expect(await readSchemaFromConfig(join(globalDir, "skiui.json"))).toBe(
		CONFIG_SCHEMA_URL,
	)
})

test("cli init --scope global only creates global configuration", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")

	const result = await runCli(["init", "--scope", "global"], {
		cwd: projectDir,
		env: createSkiuiTestEnv({ globalDir }),
	})

	expect(result.exitCode).toBe(0)
	expect(result.stdout).toContain("Initialized global configuration")
	expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(false)
	expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true)
	expect(await readSchemaFromConfig(join(globalDir, "skiui.json"))).toBe(
		CONFIG_SCHEMA_URL,
	)
})

test("cli init --scope local creates local project configuration", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")

	const result = await runCli(["init", "--scope", "local"], {
		cwd: projectDir,
		env: createSkiuiTestEnv({ globalDir }),
	})

	expect(result.exitCode).toBe(0)
	expect(result.stdout).toContain(
		"Initialized local and project and global configuration",
	)
	expect(await fileExists(join(projectDir, ".skiui", "skiui.local.json"))).toBe(
		true,
	)
	expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(true)
	expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true)
	expect(
		await readSchemaFromConfig(join(projectDir, ".skiui", "skiui.local.json")),
	).toBe(CONFIG_SCHEMA_URL)
	expect(
		await readSchemaFromConfig(join(projectDir, ".skiui", "skiui.json")),
	).toBe(CONFIG_SCHEMA_URL)
	expect(await readSchemaFromConfig(join(globalDir, "skiui.json"))).toBe(
		CONFIG_SCHEMA_URL,
	)
})
