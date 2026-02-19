import { afterEach, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createSkiuiTestEnv,
  createTempPathManager,
} from "../../../lib/testing/test-env";
import { fileExists, runCli } from "../test-utils";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli add-repo allows explicit repository name", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const sourceRoot = join(projectDir, ".skiui", "external-skills");
  await mkdir(join(sourceRoot, "my-skill"), { recursive: true });
  await writeFile(
    join(sourceRoot, "my-skill", "SKILL.md"),
    "# My Skill\n",
    "utf8",
  );

  const addRepoResult = await runCli(
    ["add-repo", ".skiui/external-skills", "--name", "external"],
    {
      cwd: projectDir,
      env,
    },
  );
  expect(addRepoResult.exitCode).toBe(0);
  expect(addRepoResult.stdout).toContain("applied initial sync");

  expect(
    await fileExists(
      join(projectDir, ".skiui", "external-skills", "my-skill", "SKILL.md"),
    ),
  ).toBe(true);

  const addSkillResult = await runCli(
    ["enable-skill", "external", "my-skill"],
    { cwd: projectDir, env },
  );

  expect(addSkillResult.exitCode).toBe(0);
  expect(addSkillResult.stdout).toContain("Updated project config");

  const configResult = await runCli(["config"], { cwd: projectDir, env });
  const parsed = JSON.parse(configResult.stdout) as {
    repositories: Array<{
      source: { type: string; url?: string; path?: string };
      skills: Array<{ path: string; enabled: boolean }>;
    }>;
  };

  expect(
    parsed.repositories.some(
      (repository) =>
        repository.source.type === "fs" &&
        repository.source.path === ".skiui/external-skills" &&
        repository.skills.some(
          (skill) => skill.path === "my-skill" && skill.enabled,
        ),
    ),
  ).toBe(true);
});

test("cli add-repo rejects invalid explicit repository name", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const addRepoResult = await runCli(
    ["add-repo", ".skiui/local", "--name", "Invalid Name"],
    { cwd: projectDir, env },
  );
  expect(addRepoResult.exitCode).toBe(1);
  expect(addRepoResult.stderr).toContain(
    "Repository name must contain only lowercase letters",
  );
});
