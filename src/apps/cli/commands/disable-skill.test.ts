import { afterEach, expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
	createSkiuiTestEnv,
	createTempPathManager,
} from "../../../lib/testing/test-env"
import { fileExists, runCli } from "../test-utils"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("cli skill disable updates project scope", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const enableResult = await runCli(["skill", "enable", "local", "my-skill"], {
		cwd: projectDir,
		env,
	})
	expect(enableResult.exitCode).toBe(0)

	const disableResult = await runCli(
		["skill", "disable", "local", "my-skill", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(disableResult.exitCode).toBe(0)
	expect(disableResult.stdout).toContain("Updated project config")

	const configResult = await runCli(["config"], { cwd: projectDir, env })
	expect(configResult.exitCode).toBe(0)
	const parsed = JSON.parse(configResult.stdout) as {
		repositories: Array<{
			name: string
			skills: Array<{ path: string; enabled: boolean }>
		}>
	}
	const localRepository = parsed.repositories.find(
		(repository) => repository.name === "local",
	)
	const skill = localRepository?.skills.find(
		(entry) => entry.path === "my-skill",
	)
	expect(skill?.enabled).toBe(false)
})

test("cli skill disable reports already disabled", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	await runCli(["skill", "enable", "local", "my-skill"], {
		cwd: projectDir,
		env,
	})

	const firstDisableResult = await runCli(
		["skill", "disable", "local", "my-skill", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(firstDisableResult.exitCode).toBe(0)

	const secondDisableResult = await runCli(
		["skill", "disable", "local", "my-skill", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(secondDisableResult.exitCode).toBe(0)
	expect(secondDisableResult.stdout).toContain("already disabled")
})

test("cli skill disable errors when skill does not exist", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const disableResult = await runCli(
		["skill", "disable", "local", "missing-skill", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(disableResult.exitCode).toBe(1)
	expect(disableResult.stderr).toContain(
		"Skill `missing-skill` was not found in repository `local` in project config",
	)
})

test("cli skill disable removes stale project symlink destinations", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	await mkdir(join(projectDir, ".skiui", "local", "my-skill"), {
		recursive: true,
	})
	await writeFile(
		join(projectDir, ".skiui", "local", "my-skill", "SKILL.md"),
		"# My Skill\n",
		"utf8",
	)

	const enableSkillResult = await runCli(
		["skill", "enable", "local", "my-skill"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(enableSkillResult.exitCode).toBe(0)

	const enableAgentResult = await runCli(
		["agent", "enable", "claude", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(enableAgentResult.exitCode).toBe(0)

	const applyResult = await runCli(["apply"], { cwd: projectDir, env })
	expect(applyResult.exitCode).toBe(0)

	const linkedSkillPath = join(projectDir, ".claude", "skills", "my-skill")
	const claudeSkillsDir = join(projectDir, ".claude", "skills")
	const claudeDir = join(projectDir, ".claude")
	const linkedRulesPath = join(projectDir, "CLAUDE.md")
	expect(await fileExists(linkedSkillPath)).toBe(true)
	expect(await fileExists(linkedRulesPath)).toBe(true)

	const disableSkillResult = await runCli(
		["skill", "disable", "local", "my-skill", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(disableSkillResult.exitCode).toBe(0)

	expect(await fileExists(linkedSkillPath)).toBe(false)
	expect(await fileExists(claudeSkillsDir)).toBe(false)
	expect(await fileExists(claudeDir)).toBe(false)
	expect(await fileExists(linkedRulesPath)).toBe(true)
})
