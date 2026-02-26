import { rm } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import type { RepositoryConfig } from "../config/types"
import { CliError } from "../utils/errors"
import { ensureDirectory, pathExists } from "../utils/fs"
import { normalizeGitUrl } from "../utils/git"
import type { GitRepositorySource } from "./types"

type GitRepositoryConfig = Omit<RepositoryConfig, "source"> & {
	source: GitRepositorySource
}

export type SyncedRepository = {
	cacheRepositoryPath: string
	skillRootPath: string
}

export async function syncRepositoryToCache(options: {
	repository: RepositoryConfig
	contextRoot: string
	cacheRepositoryPath: string
}): Promise<SyncedRepository> {
	const { repository } = options

	if (repository.source.type === "git") {
		return syncGitRepositoryToCache({
			...options,
			repository: repository as GitRepositoryConfig,
		})
	}

	return syncFsRepositoryToCache(options)
}

async function syncGitRepositoryToCache(options: {
	repository: GitRepositoryConfig
	contextRoot: string
	cacheRepositoryPath: string
}): Promise<SyncedRepository> {
	const { repository, contextRoot, cacheRepositoryPath } = options

	const repositoryUrl = resolveGitSource(repository.source.url, contextRoot)
	await ensureDirectory(dirname(cacheRepositoryPath))

	const existingCache = await pathExists(cacheRepositoryPath)
	if (existingCache && (await pathExists(join(cacheRepositoryPath, ".git")))) {
		const originUrl = await readGitOriginUrl(cacheRepositoryPath)
		if (
			originUrl &&
			normalizeGitUrl(originUrl) === normalizeGitUrl(repositoryUrl)
		) {
			const pullArgs = repository.source.branch
				? ["pull", "--ff-only", "origin", repository.source.branch]
				: ["pull", "--ff-only"]

			const pulled = await runGitSafely(
				pullArgs,
				cacheRepositoryPath,
				`Failed to update repository \`${repository.name}\` with pull`,
			)

			if (!pulled) {
				await recloneGitRepository(
					repository,
					repositoryUrl,
					contextRoot,
					cacheRepositoryPath,
				)
			}
		} else {
			await recloneGitRepository(
				repository,
				repositoryUrl,
				contextRoot,
				cacheRepositoryPath,
			)
		}
	} else {
		await recloneGitRepository(
			repository,
			repositoryUrl,
			contextRoot,
			cacheRepositoryPath,
		)
	}

	return {
		cacheRepositoryPath,
		skillRootPath: join(
			cacheRepositoryPath,
			repository.source.path ?? "skills",
		),
	}
}

async function recloneGitRepository(
	repository: GitRepositoryConfig,
	repositoryUrl: string,
	contextRoot: string,
	cacheRepositoryPath: string,
): Promise<void> {
	await rm(cacheRepositoryPath, { recursive: true, force: true })

	const cloneArgs = ["clone", "--depth", "1"]

	if (repository.source.branch) {
		cloneArgs.push("--branch", repository.source.branch)
	}

	cloneArgs.push(repositoryUrl, cacheRepositoryPath)
	await runGit(
		cloneArgs,
		contextRoot,
		`Failed to clone repository \`${repository.name}\``,
	)
}

async function syncFsRepositoryToCache(options: {
	repository: RepositoryConfig
	contextRoot: string
	cacheRepositoryPath: string
}): Promise<SyncedRepository> {
	const { repository, contextRoot } = options

	if (repository.source.type !== "fs") {
		throw new CliError("Internal error: expected filesystem repository source")
	}

	const sourcePath = isAbsolute(repository.source.path)
		? repository.source.path
		: resolve(contextRoot, repository.source.path)

	if (!(await pathExists(sourcePath))) {
		throw new CliError(`Repository source path does not exist: ${sourcePath}`)
	}

	const sourceAbsolute = resolve(sourcePath)

	return {
		cacheRepositoryPath: resolve(options.cacheRepositoryPath),
		skillRootPath: sourceAbsolute,
	}
}

async function runGit(
	args: string[],
	cwd: string,
	errorPrefix: string,
): Promise<void> {
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
		const details = [stdout.trim(), stderr.trim()]
			.filter((line) => line.length > 0)
			.join("\n")
		throw new CliError(`${errorPrefix}: ${details || "git command failed"}`)
	}
}

async function runGitSafely(
	args: string[],
	cwd: string,
	errorPrefix: string,
): Promise<boolean> {
	try {
		await runGit(args, cwd, errorPrefix)
		return true
	} catch {
		return false
	}
}

async function readGitOriginUrl(
	repositoryPath: string,
): Promise<string | null> {
	const processHandle = Bun.spawn({
		cmd: ["git", "config", "--get", "remote.origin.url"],
		cwd: repositoryPath,
		stdout: "pipe",
		stderr: "pipe",
	})

	const [exitCode, stdout] = await Promise.all([
		processHandle.exited,
		new Response(processHandle.stdout).text(),
	])

	if (exitCode !== 0) {
		return null
	}

	const trimmed = stdout.trim()
	return trimmed.length > 0 ? trimmed : null
}

function resolveGitSource(sourceUrl: string, contextRoot: string): string {
	const trimmed = sourceUrl.trim()

	if (trimmed.includes("://") || trimmed.startsWith("git@")) {
		return trimmed
	}

	if (isAbsolute(trimmed)) {
		return trimmed
	}

	return resolve(contextRoot, trimmed)
}
