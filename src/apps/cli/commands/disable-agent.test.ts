import { afterEach, expect, test } from "bun:test";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { runCli } from "../test-utils";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli agent disable updates global scope", async () => {
  const workingDir = await tempPaths.createTempPath("skiui-cli-work-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init", "--global"], { cwd: workingDir, env });
  expect(initResult.exitCode).toBe(0);

  const enableResult = await runCli(["agent", "enable", "claude", "--scope", "global"], { cwd: workingDir, env });
  expect(enableResult.exitCode).toBe(0);

  const disableResult = await runCli(["agent", "disable", "claude", "--scope", "global"], {
    cwd: workingDir,
    env
  });
  expect(disableResult.exitCode).toBe(0);
  expect(disableResult.stdout).toContain("Updated global config");

  const configResult = await runCli(["config"], { cwd: workingDir, env });
  expect(configResult.exitCode).toBe(0);
  const parsed = JSON.parse(configResult.stdout) as { assistants: Record<string, string> };
  expect(parsed.assistants.claude).toBe("disabled");
});

test("cli agent disable reports already disabled status", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const disableResult = await runCli(["agent", "disable", "claude", "--scope", "project"], {
    cwd: projectDir,
    env
  });
  expect(disableResult.exitCode).toBe(0);

  const secondDisableResult = await runCli(["agent", "disable", "claude", "--scope", "project"], {
    cwd: projectDir,
    env
  });
  expect(secondDisableResult.exitCode).toBe(0);
  expect(secondDisableResult.stdout).toContain("already disabled in project config");
});
