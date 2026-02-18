import { afterEach, expect, test } from "bun:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryConfig } from "../config/types";
import { createTempPathManager } from "../testing/test-env";
import { pathExists } from "../utils/fs";
import { syncRepositoryToCache } from "./sync";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("syncRepositoryToCache copies filesystem repositories into cache", async () => {
  const workspace = await tempPaths.createTempPath("skiui-sync-");
  const sourcePath = join(workspace, "source");
  const cachePath = join(workspace, "cache", "repo");

  await mkdir(join(sourcePath, "my-skill"), { recursive: true });
  await Bun.write(join(sourcePath, "my-skill", "SKILL.md"), "# My Skill\n\nSkill description.\n");

  const repository: RepositoryConfig = {
    name: "repo",
    source: {
      type: "fs",
      path: sourcePath
    },
    skills: []
  };

  const synced = await syncRepositoryToCache({
    repository,
    contextRoot: workspace,
    cacheRepositoryPath: cachePath
  });

  expect(synced.cacheRepositoryPath).toBe(cachePath);
  expect(synced.skillRootPath).toBe(cachePath);
  expect(await pathExists(join(cachePath, "my-skill", "SKILL.md"))).toBe(true);
  expect(await pathExists(join(sourcePath, "my-skill", "SKILL.md"))).toBe(true);

  const contents = await readFile(join(cachePath, "my-skill", "SKILL.md"), "utf8");
  expect(contents).toContain("My Skill");
});

test("syncRepositoryToCache rejects overlapping source and cache paths", async () => {
  const workspace = await tempPaths.createTempPath("skiui-sync-");
  const sourcePath = join(workspace, "source");
  await mkdir(sourcePath, { recursive: true });

  const repository: RepositoryConfig = {
    name: "repo",
    source: {
      type: "fs",
      path: sourcePath
    },
    skills: []
  };

  await expect(
    syncRepositoryToCache({
      repository,
      contextRoot: workspace,
      cacheRepositoryPath: sourcePath
    })
  ).rejects.toThrow("identical source and cache paths");
});
