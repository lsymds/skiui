import { afterEach, expect, test } from "bun:test";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { runCli } from "../test-utils";

const VERCEL_AGENT_SKILLS_REPOSITORY = "https://github.com/vercel-labs/agent-skills";
const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli add-skill git updates project configuration", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const addSkillResult = await runCli(
    ["add-skill", "git", "my-skill", "--repository", VERCEL_AGENT_SKILLS_REPOSITORY],
    { cwd: projectDir, env }
  );

  expect(addSkillResult.exitCode).toBe(0);
  expect(addSkillResult.stdout).toContain("Updated project config");

  const configResult = await runCli(["config"], { cwd: projectDir, env });
  const parsed = JSON.parse(configResult.stdout) as {
    repositories: Array<{
      source: { type: string; url?: string };
      skills: Array<{ name: string; enabled: boolean }>;
    }>;
  };

  expect(
    parsed.repositories.some(
      (repository) =>
        repository.source.type === "git" &&
        repository.source.url === VERCEL_AGENT_SKILLS_REPOSITORY &&
        repository.skills.some((skill) => skill.name === "my-skill" && skill.enabled)
    )
  ).toBe(true);
});
