import { afterEach, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { initConfig } from "../service";
import { addSkill } from "../../testing/add-skill";
import { addRepository, enableSkill, listEnabledSkills } from "./index";
import { createSkiuiTestEnv, createTempPathManager } from "../../testing/test-env";

const VERCEL_AGENT_SKILLS_REPOSITORY = "https://github.com/vercel-labs/agent-skills";
const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("addSkill writes to project config by default when project config exists", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

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
  const workingDir = await tempPaths.createTempPath("skiui-work-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

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

test("addSkill does not duplicate repository when git URL formatting differs", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const firstResult = await addSkill({
    sourceType: "git",
    repositoryUrl: `${VERCEL_AGENT_SKILLS_REPOSITORY}.git`,
    skillName: "first-skill",
    global: false,
    cwd: projectDir,
    env
  });

  const secondResult = await addSkill({
    sourceType: "git",
    repositoryUrl: `${VERCEL_AGENT_SKILLS_REPOSITORY}/`,
    skillName: "second-skill",
    global: false,
    cwd: projectDir,
    env
  });

  expect(firstResult.repositoryAdded).toBe(true);
  expect(secondResult.repositoryAdded).toBe(false);
  expect(secondResult.skillAdded).toBe(true);

  const projectConfig = JSON.parse(await readFile(join(projectDir, ".skiui", "skiui.json"), "utf8")) as {
    repositories: Array<{
      source: { type: string; url?: string };
      skills: Array<{ path: string }>;
    }>;
  };

  const agentSkillRepos = projectConfig.repositories.filter(
    (repository) => repository.source.type === "git" && repository.source.url === VERCEL_AGENT_SKILLS_REPOSITORY
  );

  expect(agentSkillRepos).toHaveLength(1);
  expect(agentSkillRepos[0]?.skills.map((skill) => skill.path).sort()).toEqual(["first-skill", "second-skill"]);
});

test("addSkill does not duplicate repository when fs path formatting differs", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const firstResult = await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui/local/",
    skillName: "first-fs-skill",
    global: false,
    cwd: projectDir,
    env
  });

  const secondResult = await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui\\local",
    skillName: "second-fs-skill",
    global: false,
    cwd: projectDir,
    env
  });

  expect(firstResult.repositoryAdded).toBe(false);
  expect(firstResult.skillAdded).toBe(true);
  expect(secondResult.repositoryAdded).toBe(false);
  expect(secondResult.skillAdded).toBe(true);

  const projectConfig = JSON.parse(await readFile(join(projectDir, ".skiui", "skiui.json"), "utf8")) as {
    repositories: Array<{
      name: string;
      source: { type: string; path?: string };
      skills: Array<{ path: string }>;
    }>;
  };

  const localRepos = projectConfig.repositories.filter(
    (repository) => repository.source.type === "fs" && repository.source.path === ".skiui/local"
  );

  expect(localRepos).toHaveLength(1);
  expect(localRepos[0]?.skills.map((skill) => skill.path).sort()).toEqual(["first-fs-skill", "second-fs-skill"]);
});

test("addRepository infers git source and avoids duplicate entries", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const firstResult = await addRepository({
    repository: `${VERCEL_AGENT_SKILLS_REPOSITORY}.git`,
    global: false,
    cwd: projectDir,
    env
  });

  const secondResult = await addRepository({
    repository: `${VERCEL_AGENT_SKILLS_REPOSITORY}/`,
    global: false,
    cwd: projectDir,
    env
  });

  expect(firstResult.repositoryAdded).toBe(true);
  expect(secondResult.repositoryAdded).toBe(false);
  expect(secondResult.repositoryName).toBe("agent-skills");

  const projectConfig = JSON.parse(await readFile(join(projectDir, ".skiui", "skiui.json"), "utf8")) as {
    repositories: Array<{ source: { type: string; url?: string } }>;
  };

  const agentSkillRepos = projectConfig.repositories.filter(
    (repository) => repository.source.type === "git" && repository.source.url === VERCEL_AGENT_SKILLS_REPOSITORY
  );
  expect(agentSkillRepos).toHaveLength(1);
});

test("addRepository allows explicit repository name", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const result = await addRepository({
    repository: VERCEL_AGENT_SKILLS_REPOSITORY,
    repositoryName: "shared-skills",
    global: false,
    cwd: projectDir,
    env
  });

  expect(result.repositoryAdded).toBe(true);
  expect(result.repositoryName).toBe("shared-skills");
});

test("addRepository errors when explicit name conflicts with different source", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  await addRepository({
    repository: VERCEL_AGENT_SKILLS_REPOSITORY,
    repositoryName: "shared-skills",
    global: false,
    cwd: projectDir,
    env
  });

  await expect(
    addRepository({
      repository: ".skiui/another-source",
      repositoryName: "shared-skills",
      global: false,
      cwd: projectDir,
      env
    })
  ).rejects.toThrow("already exists in project config with a different source");
});

test("addRepository errors when source exists under different name", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  await addRepository({
    repository: VERCEL_AGENT_SKILLS_REPOSITORY,
    repositoryName: "shared-skills",
    global: false,
    cwd: projectDir,
    env
  });

  await expect(
    addRepository({
      repository: `${VERCEL_AGENT_SKILLS_REPOSITORY}.git`,
      repositoryName: "other-name",
      global: false,
      cwd: projectDir,
      env
    })
  ).rejects.toThrow("source already exists as `shared-skills`");
});

test("enableSkill enables existing disabled skill in repository", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const addRepositoryResult = await addRepository({
    repository: VERCEL_AGENT_SKILLS_REPOSITORY,
    global: false,
    cwd: projectDir,
    env
  });

  const configPath = join(projectDir, ".skiui", "skiui.json");
  const projectConfig = JSON.parse(await readFile(configPath, "utf8")) as {
    version: number;
    cachePath: string;
    assistants: Record<string, "enabled" | "disabled">;
    repositories: Array<{
      name: string;
      source: { type: "git"; url: string } | { type: "fs"; path: string };
      skills: Array<{ path: string; name: string; enabled: boolean }>;
    }>;
  };

  const repository = projectConfig.repositories.find((entry) => entry.name === addRepositoryResult.repositoryName);
  if (!repository) {
    throw new Error("Expected repository to exist");
  }

  repository.skills.push({
    path: "my-skill",
    name: "my-skill",
    enabled: false
  });

  await writeFile(configPath, `${JSON.stringify(projectConfig, null, 2)}\n`, "utf8");

  const enableResult = await enableSkill({
    repositoryName: addRepositoryResult.repositoryName,
    skillName: "my-skill",
    global: false,
    cwd: projectDir,
    env
  });

  expect(enableResult.skillAdded).toBe(false);
  expect(enableResult.skillEnabled).toBe(true);

  const updatedProjectConfig = JSON.parse(await readFile(configPath, "utf8")) as {
    repositories: Array<{ name: string; skills: Array<{ path: string; enabled: boolean }> }>;
  };
  const updatedRepository = updatedProjectConfig.repositories.find(
    (entry) => entry.name === addRepositoryResult.repositoryName
  );
  const skill = updatedRepository?.skills.find((entry) => entry.path === "my-skill");

  expect(skill?.enabled).toBe(true);
});

test("listEnabledSkills includes scope for enabled entries", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

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
