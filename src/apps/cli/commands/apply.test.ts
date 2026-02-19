import { afterEach, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { fileExists, runCli } from "../test-utils";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli apply links enabled project skills and reports missing skills", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const homeDir = await tempPaths.createTempPath("skiui-cli-home-");
  const env = createSkiuiTestEnv({ globalDir, homeDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  await mkdir(join(projectDir, ".skiui", "local", "my-skill"), { recursive: true });
  await writeFile(
    join(projectDir, ".skiui", "local", "my-skill", "SKILL.md"),
    "# My Skill\n\nProject skill description.\n",
    "utf8"
  );

  const enableSkillResult = await runCli(["enable-skill", "local", "my-skill"], { cwd: projectDir, env });
  expect(enableSkillResult.exitCode).toBe(0);

  const projectConfigPath = join(projectDir, ".skiui", "skiui.json");
  const projectConfig = JSON.parse(await readFile(projectConfigPath, "utf8")) as {
    assistants: Record<string, string>;
  };
  projectConfig.assistants.claude = "enabled";
  await writeFile(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`, "utf8");

  const applyResult = await runCli(["apply"], { cwd: projectDir, env });
  expect(applyResult.exitCode).toBe(0);
  expect(applyResult.stdout).toContain("Applied project scope");
  expect(await fileExists(join(projectDir, ".claude", "skills", "my-skill"))).toBe(true);
  expect(await fileExists(join(projectDir, "CLAUDE.md"))).toBe(true);

  const addMissingSkillResult = await runCli(["enable-skill", "local", "missing-skill"], { cwd: projectDir, env });
  expect(addMissingSkillResult.exitCode).toBe(0);

  const applyWithMissingResult = await runCli(["apply"], { cwd: projectDir, env });
  expect(applyWithMissingResult.exitCode).toBe(1);
  expect(applyWithMissingResult.stderr).toContain("Enabled skills were not found in repository sources");
  expect(applyWithMissingResult.stderr).toContain("missing-skill");
});
