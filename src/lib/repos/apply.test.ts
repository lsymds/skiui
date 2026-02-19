import { afterEach, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyConfiguredSkills } from "./apply";
import { addSkill } from "../config/skills";
import { initConfig } from "../config/service";
import { createSkiuiTestEnv, createTempPathManager } from "../testing/test-env";
import { isSymlink, pathExists } from "../utils/fs";

const VERCEL_AGENT_SKILLS_REPOSITORY = "https://github.com/vercel-labs/agent-skills";
const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("applyConfiguredSkills syncs catalog metadata and links enabled project skills", async () => {
  const harness = await setupProjectHarness();

  const localSkillDirectory = join(harness.projectDir, ".skiui", "local", "my-skill");
  await mkdir(localSkillDirectory, { recursive: true });
  await Bun.write(join(localSkillDirectory, "SKILL.md"), "# My Skill\n\nSkill description from metadata.\n");

  await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui/local",
    skillName: "my-skill",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  await setAssistantState(join(harness.projectDir, ".skiui", "skiui.json"), "claude-code", "enabled");

  const result = await applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env });

  expect(result.missingSkills).toHaveLength(0);
  expect(result.scopes.some((scope) => scope.scope === "project" && scope.skillsLinked > 0)).toBe(true);

  const linkedSkillPath = join(harness.projectDir, ".claude", "skills", "my-skill");
  expect(await pathExists(linkedSkillPath)).toBe(true);
  expect(await isSymlink(linkedSkillPath)).toBe(true);
  expect(await pathExists(join(harness.projectDir, ".skiui", "repos", "local", "my-skill", "SKILL.md"))).toBe(false);

  const gitignoreLines = await readGitignoreLines(harness.projectDir);
  expect(gitignoreLines.has(".claude/skills")).toBe(true);
  expect(gitignoreLines.has(".opencode/skills")).toBe(true);
  expect(gitignoreLines.has(".claude")).toBe(false);

  const projectConfig = await readJson<{ repositories: Array<{ name: string; skills: Array<{ path: string; name: string; description?: string; enabled: boolean }> }> }>(
    join(harness.projectDir, ".skiui", "skiui.json")
  );
  const localRepository = projectConfig.repositories.find((repository) => repository.name === "local");
  const mySkill = localRepository?.skills.find((skill) => skill.path === "my-skill");

  expect(mySkill?.name).toBe("My Skill");
  expect(mySkill?.description).toBe("Skill description from metadata.");
  expect(mySkill?.enabled).toBe(true);
});

test("applyConfiguredSkills extracts description from frontmatter metadata", async () => {
  const harness = await setupProjectHarness();

  const localSkillDirectory = join(harness.projectDir, ".skiui", "local", "frontmatter-skill");
  await mkdir(localSkillDirectory, { recursive: true });
  await Bun.write(
    join(localSkillDirectory, "SKILL.md"),
    "---\nname: frontmatter-skill\ndescription: Description from frontmatter metadata.\n---\n\n# Frontmatter Skill\n\nBody description fallback.\n"
  );

  await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui/local",
    skillName: "frontmatter-skill",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  const result = await applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env });
  expect(result.missingSkills).toHaveLength(0);

  const projectConfig = await readJson<{ repositories: Array<{ skills: Array<{ path: string; description?: string }> }> }>(
    join(harness.projectDir, ".skiui", "skiui.json")
  );
  const frontmatterSkill = projectConfig.repositories
    .flatMap((repository) => repository.skills)
    .find((skill) => skill.path === "frontmatter-skill");

  expect(frontmatterSkill?.description).toBe("Description from frontmatter metadata.");
});

test("applyConfiguredSkills clones vercel git repository and extracts frontmatter description", async () => {
  const harness = await setupProjectHarness();

  await addSkill({
    sourceType: "git",
    repositoryUrl: VERCEL_AGENT_SKILLS_REPOSITORY,
    skillName: "web-design-guidelines",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  await setAssistantState(join(harness.projectDir, ".skiui", "skiui.json"), "claude-code", "enabled");

  const result = await applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env });

  expect(result.missingSkills).toHaveLength(0);
  expect(result.scopes.some((scope) => scope.scope === "project" && scope.repositoriesSynced > 0)).toBe(true);

  const linkedSkillPath = join(harness.projectDir, ".claude", "skills", "web-design-guidelines");
  expect(await pathExists(linkedSkillPath)).toBe(true);
  expect(await isSymlink(linkedSkillPath)).toBe(true);

  const projectConfig = await readJson<{
    repositories: Array<{
      name: string;
      lastFetched?: string;
      skills: Array<{ path: string; name: string; description?: string; enabled: boolean }>;
    }>;
  }>(join(harness.projectDir, ".skiui", "skiui.json"));
  const repository = projectConfig.repositories.find((entry) => entry.name === "agent-skills");
  const skill = repository?.skills.find((entry) => entry.path === "web-design-guidelines");

  expect(repository?.lastFetched).toBeDefined();
  expect(skill?.enabled).toBe(true);
  expect(skill?.description).toContain("Review UI code for Web Interface Guidelines compliance");
  expect(skill?.description).not.toBe("---");
}, 30_000);

test("applyConfiguredSkills returns missing enabled skills", async () => {
  const harness = await setupProjectHarness();

  await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui/local",
    skillName: "missing-skill",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  await setAssistantState(join(harness.projectDir, ".skiui", "skiui.json"), "claude-code", "enabled");

  const result = await applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env });

  expect(result.missingSkills).toHaveLength(1);
  expect(result.missingSkills[0]).toEqual({
    scope: "project",
    repositoryName: "local",
    skillPath: "missing-skill"
  });
});

test("applyConfiguredSkills rejects overlapping fs source and assistant destination paths", async () => {
  const harness = await setupProjectHarness();
  const overlappingSkillDirectory = join(harness.projectDir, ".claude", "skills", "my-skill");

  await mkdir(overlappingSkillDirectory, { recursive: true });
  await Bun.write(join(overlappingSkillDirectory, "SKILL.md"), "# My Skill\n\nSkill description from metadata.\n");

  await addSkill({
    sourceType: "fs",
    sourcePath: ".claude/skills",
    skillName: "my-skill",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  await setAssistantState(join(harness.projectDir, ".skiui", "skiui.json"), "claude-code", "enabled");

  await expect(applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env })).rejects.toThrow("overlap");

  expect(await pathExists(join(overlappingSkillDirectory, "SKILL.md"))).toBe(true);
  expect(await isSymlink(overlappingSkillDirectory)).toBe(false);
});

test("applyConfiguredSkills applies global scope to HOME and project scope to cwd", async () => {
  const harness = await setupProjectHarness();
  const globalFsSource = await tempPaths.createTempPath("skiui-global-skills-");

  await mkdir(join(globalFsSource, "global-skill"), { recursive: true });
  await mkdir(join(harness.projectDir, ".skiui", "local", "project-skill"), { recursive: true });
  await Bun.write(join(globalFsSource, "global-skill", "SKILL.md"), "# Global Skill\n\nGlobal description.\n");
  await Bun.write(
    join(harness.projectDir, ".skiui", "local", "project-skill", "SKILL.md"),
    "# Project Skill\n\nProject description.\n"
  );

  await addSkill({
    sourceType: "fs",
    sourcePath: globalFsSource,
    skillName: "global-skill",
    global: true,
    cwd: harness.projectDir,
    env: harness.env
  });

  await addSkill({
    sourceType: "fs",
    sourcePath: ".skiui/local",
    skillName: "project-skill",
    global: false,
    cwd: harness.projectDir,
    env: harness.env
  });

  await setAssistantState(join(harness.globalDir, "skiui.json"), "claude-code", "enabled");
  await setAssistantState(join(harness.globalDir, "skiui.json"), "opencode", "enabled");
  await setAssistantState(join(harness.projectDir, ".skiui", "skiui.json"), "claude-code", "enabled");

  const result = await applyConfiguredSkills({ cwd: harness.projectDir, env: harness.env });

  expect(result.missingSkills).toHaveLength(0);
  expect(await pathExists(join(harness.homeDir, ".claude", "skills", "global-skill"))).toBe(true);
  expect(await pathExists(join(harness.homeDir, ".config", "opencode", "skills", "global-skill"))).toBe(true);
  expect(await pathExists(join(harness.projectDir, ".claude", "skills", "project-skill"))).toBe(true);
});

async function setupProjectHarness(): Promise<{
  projectDir: string;
  globalDir: string;
  homeDir: string;
  env: NodeJS.ProcessEnv;
}> {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const homeDir = await tempPaths.createTempPath("skiui-home-");
  const env = createSkiuiTestEnv({ globalDir, homeDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  return {
    projectDir,
    globalDir,
    homeDir,
    env
  };
}

async function setAssistantState(
  configPath: string,
  assistantId: string,
  status: "enabled" | "disabled"
): Promise<void> {
  const config = await readJson<{ assistants: Record<string, string> }>(configPath);
  config.assistants[assistantId] = status;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readGitignoreLines(projectDir: string): Promise<Set<string>> {
  const gitignoreContents = await readFile(join(projectDir, ".gitignore"), "utf8");

  return new Set(
    gitignoreContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
}
