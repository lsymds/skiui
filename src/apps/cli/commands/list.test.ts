import { afterEach, expect, test } from "bun:test";
import { createSkiuiTestEnv, createTempPathManager } from "../../../lib/testing/test-env";
import { runCli } from "../test-utils";

const VERCEL_AGENT_SKILLS_REPOSITORY = "https://github.com/vercel-labs/agent-skills";
const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("cli list prints enabled skills by scope", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-cli-project-");
  const globalDir = await tempPaths.createTempPath("skiui-cli-global-");
  const env = createSkiuiTestEnv({ globalDir });

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const addRepoResult = await runCli(["repo", "add", VERCEL_AGENT_SKILLS_REPOSITORY], { cwd: projectDir, env });
  expect(addRepoResult.exitCode).toBe(0);

  const addSkillResult = await runCli(["skill", "enable", "agent-skills", "my-skill"], { cwd: projectDir, env });
  expect(addSkillResult.exitCode).toBe(0);

  const listResult = await runCli(["list"], { cwd: projectDir, env });
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toContain("project:");
  expect(listResult.stdout).toContain("agent-skills (git)");
  expect(listResult.stdout).toContain("my-skill");
});
