import { afterEach, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { runCli } from "../test-utils";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli config returns merged project config", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const localConfigPath = join(projectDir, ".skiui", "skiui.local.json");
  await writeFile(
    localConfigPath,
    JSON.stringify(
      {
        version: 1,
        cachePath: ".skiui/local-cache",
        assistants: {
          opencode: "enabled"
        },
        repositories: []
      },
      null,
      2
    ),
    "utf8"
  );

  const configResult = await runCli(["config"], { cwd: projectDir, env });

  expect(configResult.exitCode).toBe(0);
  const parsed = JSON.parse(configResult.stdout) as {
    cachePath: string;
    assistants: Record<string, string>;
  };

  expect(parsed.cachePath).toBe(".skiui/local-cache");
  expect(parsed.assistants.opencode).toBe("enabled");
});

test("cli config errors when no config is present", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");

  const result = await runCli(["config"], {
    cwd: projectDir,
    env: createSkiuiTestEnv({ globalDir })
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("No skiui configuration found. Run `skiui init` first.");
});

test("cli config includes latest persisted repositories", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await runCli(["init"], { cwd: projectDir, env });
  await runCli(["add-skill", "fs", "my-skill", "--path", ".skiui/local"], { cwd: projectDir, env });

  const configResult = await runCli(["config"], { cwd: projectDir, env });
  const parsed = JSON.parse(configResult.stdout) as {
    repositories: Array<{ skills: Array<{ name: string }> }>;
  };

  expect(parsed.repositories.some((repository) => repository.skills.some((skill) => skill.name === "my-skill"))).toBe(true);

  const projectConfigContents = await readFile(join(projectDir, ".skiui", "skiui.json"), "utf8");
  expect(projectConfigContents.includes("my-skill")).toBe(true);
});
