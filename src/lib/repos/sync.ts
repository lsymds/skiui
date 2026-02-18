import { cp, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { CliError } from "../utils/errors";
import { ensureDirectory, pathExists } from "../utils/fs";
import type { RepositoryConfig } from "../config/types";

export type SyncedRepository = {
  cacheRepositoryPath: string;
  skillRootPath: string;
};

export async function syncRepositoryToCache(options: {
  repository: RepositoryConfig;
  contextRoot: string;
  cacheRepositoryPath: string;
}): Promise<SyncedRepository> {
  const { repository } = options;

  if (repository.source.type === "git") {
    return syncGitRepositoryToCache(options);
  }

  return syncFsRepositoryToCache(options);
}

async function syncGitRepositoryToCache(options: {
  repository: RepositoryConfig;
  contextRoot: string;
  cacheRepositoryPath: string;
}): Promise<SyncedRepository> {
  const { repository, contextRoot, cacheRepositoryPath } = options;

  if (repository.source.type !== "git") {
    throw new CliError("Internal error: expected git repository source");
  }

  await ensureDirectory(dirname(cacheRepositoryPath));
  await rm(cacheRepositoryPath, { recursive: true, force: true });

  const repositoryUrl = resolveGitSource(repository.source.url, contextRoot);
  const cloneArgs = ["clone", "--depth", "1"];

  if (repository.source.branch) {
    cloneArgs.push("--branch", repository.source.branch);
  }

  cloneArgs.push(repositoryUrl, cacheRepositoryPath);

  await runGit(cloneArgs, contextRoot, `Failed to clone repository \`${repository.name}\``);

  return {
    cacheRepositoryPath,
    skillRootPath: join(cacheRepositoryPath, repository.source.path ?? "skills")
  };
}

async function syncFsRepositoryToCache(options: {
  repository: RepositoryConfig;
  contextRoot: string;
  cacheRepositoryPath: string;
}): Promise<SyncedRepository> {
  const { repository, contextRoot, cacheRepositoryPath } = options;

  if (repository.source.type !== "fs") {
    throw new CliError("Internal error: expected filesystem repository source");
  }

  const sourcePath = isAbsolute(repository.source.path)
    ? repository.source.path
    : resolve(contextRoot, repository.source.path);

  if (!(await pathExists(sourcePath))) {
    throw new CliError(`Repository source path does not exist: ${sourcePath}`);
  }

  const sourceAbsolute = resolve(sourcePath);
  const cacheAbsolute = resolve(cacheRepositoryPath);
  assertPathsDoNotOverlap(sourceAbsolute, cacheAbsolute, repository.name);

  await ensureDirectory(dirname(cacheAbsolute));

  const tempCopyPath = `${cacheAbsolute}.tmp-${Date.now()}`;
  await rm(tempCopyPath, { recursive: true, force: true });
  await cp(sourceAbsolute, tempCopyPath, { recursive: true });

  await rm(cacheAbsolute, { recursive: true, force: true });
  await rename(tempCopyPath, cacheAbsolute);

  return {
    cacheRepositoryPath: cacheAbsolute,
    skillRootPath: cacheAbsolute
  };
}

async function runGit(args: string[], cwd: string, errorPrefix: string): Promise<void> {
  const processHandle = Bun.spawn({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe"
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    processHandle.exited,
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text()
  ]);

  if (exitCode !== 0) {
    const details = [stdout.trim(), stderr.trim()].filter((line) => line.length > 0).join("\n");
    throw new CliError(`${errorPrefix}: ${details || "git command failed"}`);
  }
}

function resolveGitSource(sourceUrl: string, contextRoot: string): string {
  const trimmed = sourceUrl.trim();

  if (trimmed.includes("://") || trimmed.startsWith("git@")) {
    return trimmed;
  }

  if (isAbsolute(trimmed)) {
    return trimmed;
  }

  return resolve(contextRoot, trimmed);
}

function assertPathsDoNotOverlap(sourcePath: string, cachePath: string, repositoryName: string): void {
  if (sourcePath === cachePath) {
    throw new CliError(
      `Repository \`${repositoryName}\` has identical source and cache paths, which is unsafe: ${sourcePath}`
    );
  }

  if (isDescendantPath(sourcePath, cachePath) || isDescendantPath(cachePath, sourcePath)) {
    throw new CliError(
      `Repository \`${repositoryName}\` has overlapping source and cache paths, which is unsafe: ${sourcePath} <-> ${cachePath}`
    );
  }
}

function isDescendantPath(path: string, candidateAncestor: string): boolean {
  const relativePath = relative(candidateAncestor, path);
  return relativePath.length > 0 && !relativePath.startsWith("..") && relativePath !== ".";
}
