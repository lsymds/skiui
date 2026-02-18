import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SKIUI_GLOBAL_CONFIG_DIR_ENV } from "./paths";
import { initConfig } from "./service";
import { addSkill, listEnabledSkills } from "./skills";

const VERCEL_AGENT_SKILLS_REPOSITORY = "https://github.com/vercel-labs/agent-skills";
const tempPaths: string[] = [];

async function createTempPath(prefix: string): Promise<string> {
  const dirPath = await mkdtemp(join(tmpdir(), prefix));
  tempPaths.push(dirPath);
  return dirPath;
}

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0, tempPaths.length).map((path) => rm(path, { recursive: true, force: true }))
  );
});

test("addSkill writes to project config by default when project config exists", async () => {
  const projectDir = await createTempPath("skiui-project-");
  const globalDir = await createTempPath("skiui-global-");
  const env = {
    ...process.env,
    [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
  };

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const result = await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "my-skill",
    global: false,
    cwd: projectDir,
    env
  });

  expect(result.scope).toBe("project");
  expect(result.repositoryAdded).toBe(true);
  expect(result.skillAdded).toBe(true);

  const projectConfigContents = await readFile(join(projectDir, ".skiui", "skiui.json"), "utf8");
  const projectConfig = JSON.parse(projectConfigContents) as {
    repositories: Array<{
      name: string;
      source: { type: string; url?: string };
      skills: Array<{ name: string; enabled: boolean }>;
    }>;
  };

  const repository = projectConfig.repositories.find(
    (candidate) => candidate.source.type === "git" && candidate.source.url === VERCEL_AGENT_SKILLS_REPOSITORY
  );

  expect(repository).toBeDefined();
  expect(repository?.name).toBe("agent-skills");
  expect(repository?.skills.some((skill) => skill.name === "my-skill" && skill.enabled)).toBe(true);

  const secondResult = await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "my-skill",
    global: false,
    cwd: projectDir,
    env
  });

  expect(secondResult.repositoryAdded).toBe(false);
  expect(secondResult.skillAdded).toBe(false);
});

test("addSkill falls back to global config outside project context", async () => {
  const workingDir = await createTempPath("skiui-work-");
  const globalDir = await createTempPath("skiui-global-");
  const env = {
    ...process.env,
    [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
  };

  await initConfig({
    initGlobal: true,
    initProject: false,
    cwd: workingDir,
    env
  });

  const result = await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "global-skill",
    global: false,
    cwd: workingDir,
    env
  });

  expect(result.scope).toBe("global");

  const globalConfigContents = await readFile(join(globalDir, "skiui.json"), "utf8");
  const globalConfig = JSON.parse(globalConfigContents) as {
    repositories: Array<{ source: { type: string; url?: string }; skills: Array<{ name: string }> }>;
  };

  expect(
    globalConfig.repositories.some(
      (repository) =>
        repository.source.type === "git" &&
        repository.source.url === VERCEL_AGENT_SKILLS_REPOSITORY &&
        repository.skills.some((skill) => skill.name === "global-skill")
    )
  ).toBe(true);
});

test("listEnabledSkills includes scope for enabled entries", async () => {
  const projectDir = await createTempPath("skiui-project-");
  const globalDir = await createTempPath("skiui-global-");
  const env = {
    ...process.env,
    [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
  };

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "global-skill",
    global: true,
    cwd: projectDir,
    env
  });

  await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "project-skill",
    global: false,
    cwd: projectDir,
    env
  });

  await writeFile(
    join(projectDir, ".skiui", "skiui.local.json"),
    JSON.stringify(
      {
        version: 1,
        cachePath: ".skiui/repos",
        assistants: {},
        repositories: [
          {
            name: "local",
            source: {
              type: "fs",
              path: ".skiui/local"
            },
            skills: [
              {
                path: "local-skill",
                name: "local-skill",
                enabled: true
              }
            ]
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await listEnabledSkills({ cwd: projectDir, env });

  expect(result.entries.some((entry) => entry.scope === "global" && entry.skillName === "global-skill")).toBe(true);
  expect(result.entries.some((entry) => entry.scope === "project" && entry.skillName === "project-skill")).toBe(true);
  expect(result.entries.some((entry) => entry.scope === "local" && entry.skillName === "local-skill")).toBe(true);
});
