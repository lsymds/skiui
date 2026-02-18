import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { fileExists, runCli } from "../test-utils";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli init defaults to project scope", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");

  const result = await runCli(["init"], {
    cwd: projectDir,
    env: createSkiuiTestEnv({ globalDir })
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Initialized project and global configuration");
  expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(true);
  expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true);
});

test("cli init --global only creates global configuration", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");

  const result = await runCli(["init", "--global"], {
    cwd: projectDir,
    env: createSkiuiTestEnv({ globalDir })
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Initialized global configuration");
  expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(false);
  expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true);
});
