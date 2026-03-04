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

test("cli agent disable updates global scope", async () => {
	const workingDir = await tempPaths.createTempPath("skiui-cli-work-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init", "--scope", "global"], {
		cwd: workingDir,
		env,
	})
	expect(initResult.exitCode).toBe(0)

	const enableResult = await runCli(
		["agent", "enable", "claude", "--scope", "global"],
		{ cwd: workingDir, env },
	)
	expect(enableResult.exitCode).toBe(0)

	const disableResult = await runCli(
		["agent", "disable", "claude", "--scope", "global"],
		{
			cwd: workingDir,
			env,
		},
	)
	expect(disableResult.exitCode).toBe(0)
	expect(disableResult.stdout).toContain("Updated global config")

	const configResult = await runCli(["config"], { cwd: workingDir, env })
	expect(configResult.exitCode).toBe(0)
	const parsed = JSON.parse(configResult.stdout) as {
		assistants: Record<string, string>
	}
	expect(parsed.assistants.claude).toBe("disabled")
})

test("cli agent disable reports already disabled status", async () => {
	const projectDir = await tempPaths.createTempPath("skiui-cli-project-")
	const globalDir = await tempPaths.createTempPath("skiui-cli-global-")
	const env = createSkiuiTestEnv({ globalDir })

	const initResult = await runCli(["init"], { cwd: projectDir, env })
	expect(initResult.exitCode).toBe(0)

	const disableResult = await runCli(
		["agent", "disable", "claude", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(disableResult.exitCode).toBe(0)

	const secondDisableResult = await runCli(
		["agent", "disable", "claude", "--scope", "project"],
		{
			cwd: projectDir,
			env,
		},
	)
	expect(secondDisableResult.exitCode).toBe(0)
	expect(secondDisableResult.stdout).toContain(
		"already disabled in project config",
	)
})

test("cli agent disable prunes stale project skill and rule links", async () => {
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

	const enableAssistantResult = await runCli(
		["agent", "enable", "claude", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(enableAssistantResult.exitCode).toBe(0)

	const applyResult = await runCli(["apply"], { cwd: projectDir, env })
	expect(applyResult.exitCode).toBe(0)

	const linkedSkillPath = join(projectDir, ".claude", "skills", "my-skill")
	const claudeSkillsDir = join(projectDir, ".claude", "skills")
	const claudeDir = join(projectDir, ".claude")
	const linkedRulesPath = join(projectDir, "CLAUDE.md")
	expect(await fileExists(linkedSkillPath)).toBe(true)
	expect(await fileExists(linkedRulesPath)).toBe(true)

	const disableResult = await runCli(
		["agent", "disable", "claude", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(disableResult.exitCode).toBe(0)

	expect(await fileExists(linkedSkillPath)).toBe(false)
	expect(await fileExists(claudeSkillsDir)).toBe(false)
	expect(await fileExists(claudeDir)).toBe(false)
	expect(await fileExists(linkedRulesPath)).toBe(false)
})

test("cli agent disable keeps shared rule destination when still in use", async () => {
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

	const enableCodexResult = await runCli(
		["agent", "enable", "codex", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(enableCodexResult.exitCode).toBe(0)

	const enableAgentsMdResult = await runCli(
		["agent", "enable", "agentsmd", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(enableAgentsMdResult.exitCode).toBe(0)

	const applyResult = await runCli(["apply"], { cwd: projectDir, env })
	expect(applyResult.exitCode).toBe(0)

	const codexSkillPath = join(projectDir, ".codex", "skills", "my-skill")
	const sharedRulesPath = join(projectDir, "AGENTS.md")
	expect(await fileExists(codexSkillPath)).toBe(true)
	expect(await fileExists(sharedRulesPath)).toBe(true)

	const disableCodexResult = await runCli(
		["agent", "disable", "codex", "--scope", "project"],
		{ cwd: projectDir, env },
	)
	expect(disableCodexResult.exitCode).toBe(0)

	expect(await fileExists(codexSkillPath)).toBe(false)
	expect(await fileExists(sharedRulesPath)).toBe(true)
})
