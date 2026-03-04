import { afterEach, expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import type { AssistantDefinition } from "../assistants/registry"
import { CONFIG_VERSION, type SkiuiConfig } from "../config/types"
import { createTempPathManager } from "../testing/test-env"
import { isSymlink, makeSymlink, pathExists } from "../utils/fs"
import {
	buildManagedLinkPlan,
	pruneManagedSymlinks,
	removeManagedSymlinks,
} from "./symlinks"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("buildManagedLinkPlan returns managed, active, and cleanup destinations", () => {
	const projectDir = "/tmp/skiui-project"
	const assistants: AssistantDefinition[] = [
		{
			id: "claude",
			projectSkillPaths: [".claude/skills"],
			globalSkillPaths: [".claude/skills"],
			projectRulePaths: ["CLAUDE.md"],
			globalRulePaths: [".claude/CLAUDE.md"],
		},
		{
			id: "opencode",
			projectSkillPaths: [".opencode/skills"],
			globalSkillPaths: [".opencode/skills"],
			projectRulePaths: ["AGENTS.md"],
			globalRulePaths: [".opencode/AGENTS.md"],
		},
	]

	const config: SkiuiConfig = {
		version: CONFIG_VERSION,
		cachePath: ".skiui/repos",
		assistants: {
			claude: "enabled",
			opencode: "disabled",
		},
		repositories: [
			{
				name: "local",
				source: {
					type: "fs",
					path: ".skiui/local",
				},
				skills: [
					{
						path: "alpha",
						name: "alpha",
						enabled: true,
					},
					{
						path: "beta",
						name: "beta",
						enabled: false,
					},
				],
			},
		],
	}

	const plan = buildManagedLinkPlan({
		scope: "project",
		config,
		assistantRoot: projectDir,
		assistantDefinitions: assistants,
	})

	expect(plan.managedSkillDestinations).toEqual(
		new Set([
			join(projectDir, ".claude", "skills", "alpha"),
			join(projectDir, ".claude", "skills", "beta"),
			join(projectDir, ".opencode", "skills", "alpha"),
			join(projectDir, ".opencode", "skills", "beta"),
		]),
	)
	expect(plan.activeSkillDestinations).toEqual(
		new Set([join(projectDir, ".claude", "skills", "alpha")]),
	)
	expect(plan.managedRuleDestinations).toEqual(
		new Set([join(projectDir, "CLAUDE.md"), join(projectDir, "AGENTS.md")]),
	)
	expect(plan.activeRuleDestinations).toEqual(
		new Set([join(projectDir, "CLAUDE.md")]),
	)
	expect(plan.managedDestinations.size).toBe(6)
	expect(plan.activeDestinations.size).toBe(2)
	expect(plan.managedCleanupDirectories).toEqual(
		new Set([
			join(projectDir, ".claude"),
			join(projectDir, ".claude", "skills"),
			join(projectDir, ".opencode"),
			join(projectDir, ".opencode", "skills"),
		]),
	)
})

test("pruneManagedSymlinks removes stale symlinks and empty managed parents", async () => {
	const baseDir = await tempPaths.createTempPath("skiui-doctor-")
	const sourceDir = join(baseDir, "source")
	await mkdir(sourceDir, { recursive: true })

	const stalePath = join(baseDir, ".claude", "skills", "my-skill")
	await makeSymlink(sourceDir, stalePath)

	const result = await pruneManagedSymlinks({
		managedDestinations: [stalePath],
		activeDestinations: [],
		cleanupDirectories: [
			join(baseDir, ".claude", "skills"),
			join(baseDir, ".claude"),
		],
	})

	expect(result.removedCount).toBe(1)
	expect(await pathExists(stalePath)).toBe(false)
	expect(await pathExists(join(baseDir, ".claude", "skills"))).toBe(false)
	expect(await pathExists(join(baseDir, ".claude"))).toBe(false)
})

test("pruneManagedSymlinks never removes non-managed parent directories", async () => {
	const baseDir = await tempPaths.createTempPath("skiui-doctor-")
	const sourceDir = join(baseDir, "source")
	await mkdir(sourceDir, { recursive: true })

	const stalePath = join(baseDir, "custom", "skills", "my-skill")
	await makeSymlink(sourceDir, stalePath)

	const result = await pruneManagedSymlinks({
		managedDestinations: [stalePath],
		activeDestinations: [],
		cleanupDirectories: [
			join(baseDir, ".claude"),
			join(baseDir, ".claude", "skills"),
		],
	})

	expect(result.removedCount).toBe(1)
	expect(await pathExists(stalePath)).toBe(false)
	expect(await pathExists(join(baseDir, "custom", "skills"))).toBe(true)
	expect(await pathExists(join(baseDir, "custom"))).toBe(true)
})

test("removeManagedSymlinks removes symlinks and preserves regular files", async () => {
	const baseDir = await tempPaths.createTempPath("skiui-doctor-")
	const sourceDir = join(baseDir, "source")
	await mkdir(sourceDir, { recursive: true })

	const firstSymlink = join(baseDir, "first")
	const secondSymlink = join(baseDir, "second")
	const regularFilePath = join(baseDir, "regular.txt")

	await makeSymlink(sourceDir, firstSymlink)
	await makeSymlink(sourceDir, secondSymlink)
	await writeFile(regularFilePath, "hello", "utf8")

	const result = await removeManagedSymlinks({
		destinations: [
			firstSymlink,
			secondSymlink,
			regularFilePath,
			join(baseDir, "missing"),
		],
		cleanupDirectories: [resolve(baseDir)],
	})

	expect(result.removedCount).toBe(2)
	expect(await pathExists(firstSymlink)).toBe(false)
	expect(await pathExists(secondSymlink)).toBe(false)
	expect(await pathExists(regularFilePath)).toBe(true)
	expect(await isSymlink(regularFilePath)).toBe(false)
})
