import { afterEach, expect, test } from "bun:test"
import { mkdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { RepositoryConfig } from "../config/types"
import { createTempPathManager } from "../testing/test-env"
import { pathExists } from "../utils/fs"
import { syncRepositoryToCache } from "./sync"

const tempPaths = createTempPathManager()

afterEach(async () => {
	await tempPaths.cleanup()
})

test("syncRepositoryToCache keeps filesystem repositories at their source path", async () => {
	const workspace = await tempPaths.createTempPath("skiui-sync-")
	const sourcePath = join(workspace, "source")
	const cachePath = join(workspace, "cache", "repo")

	await mkdir(join(sourcePath, "my-skill"), { recursive: true })
	await Bun.write(
		join(sourcePath, "my-skill", "SKILL.md"),
		"# My Skill\n\nSkill description.\n",
	)

	const repository: RepositoryConfig = {
		name: "repo",
		source: {
			type: "fs",
			path: sourcePath,
		},
		skills: [],
	}

	const synced = await syncRepositoryToCache({
		repository,
		contextRoot: workspace,
		cacheRepositoryPath: cachePath,
	})

	expect(synced.cacheRepositoryPath).toBe(cachePath)
	expect(synced.skillRootPath).toBe(sourcePath)
	expect(await pathExists(join(cachePath, "my-skill", "SKILL.md"))).toBe(false)
	expect(await pathExists(join(sourcePath, "my-skill", "SKILL.md"))).toBe(true)

	const contents = await readFile(
		join(sourcePath, "my-skill", "SKILL.md"),
		"utf8",
	)
	expect(contents).toContain("My Skill")
})

test("syncRepositoryToCache allows identical source and cache paths for fs repositories", async () => {
	const workspace = await tempPaths.createTempPath("skiui-sync-")
	const sourcePath = join(workspace, "source")
	await mkdir(join(sourcePath, "my-skill"), { recursive: true })
	await Bun.write(
		join(sourcePath, "my-skill", "SKILL.md"),
		"# My Skill\n\nSkill description.\n",
	)

	const repository: RepositoryConfig = {
		name: "repo",
		source: {
			type: "fs",
			path: sourcePath,
		},
		skills: [],
	}

	const synced = await syncRepositoryToCache({
		repository,
		contextRoot: workspace,
		cacheRepositoryPath: sourcePath,
	})

	expect(synced.skillRootPath).toBe(sourcePath)
	expect(await pathExists(join(sourcePath, "my-skill", "SKILL.md"))).toBe(true)
})

test("syncRepositoryToCache updates existing git cache with pull", async () => {
	const workspace = await tempPaths.createTempPath("skiui-sync-")
	const sourcePath = join(workspace, "source-repo")
	const cachePath = join(workspace, "cache", "repo")

	await mkdir(join(sourcePath, "skills", "skill-a"), { recursive: true })
	await Bun.write(
		join(sourcePath, "skills", "skill-a", "SKILL.md"),
		"# Skill A\n\nDescription A\n",
	)

	await runGit(["init"], sourcePath)
	await runGit(["config", "user.name", "skiui-test"], sourcePath)
	await runGit(["config", "user.email", "skiui@example.com"], sourcePath)
	await runGit(["add", "."], sourcePath)
	await runGit(["commit", "-m", "initial"], sourcePath)

	const repository: RepositoryConfig = {
		name: "repo",
		source: {
			type: "git",
			url: sourcePath,
		},
		skills: [],
	}

	await syncRepositoryToCache({
		repository,
		contextRoot: workspace,
		cacheRepositoryPath: cachePath,
	})

	await Bun.write(join(cachePath, "marker.txt"), "keep-me")

	await mkdir(join(sourcePath, "skills", "skill-b"), { recursive: true })
	await Bun.write(
		join(sourcePath, "skills", "skill-b", "SKILL.md"),
		"# Skill B\n\nDescription B\n",
	)
	await runGit(["add", "."], sourcePath)
	await runGit(["commit", "-m", "add-skill-b"], sourcePath)

	await syncRepositoryToCache({
		repository,
		contextRoot: workspace,
		cacheRepositoryPath: cachePath,
	})

	expect(
		await pathExists(join(cachePath, "skills", "skill-b", "SKILL.md")),
	).toBe(true)
	expect(await pathExists(join(cachePath, "marker.txt"))).toBe(true)
})

async function runGit(args: string[], cwd: string): Promise<void> {
	const processHandle = Bun.spawn({
		cmd: ["git", ...args],
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	})

	const [exitCode, stdout, stderr] = await Promise.all([
		processHandle.exited,
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
	])

	if (exitCode !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${stdout}\n${stderr}`)
	}
}
