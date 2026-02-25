import { afterEach, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDefaultProjectConfig } from "./defaults";
import { resolveConfigPaths } from "./paths";
import { initConfig, loadEffectiveConfig } from "./service";
import { writeConfigFile } from "./store";
import { createSkiuiTestEnv, createTempPathManager } from "../testing/test-env";

const tempPaths = createTempPathManager();

afterEach(async () => {
  await tempPaths.cleanup();
});

test("initConfig creates project and global files and registers project", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const paths = resolveConfigPaths({ cwd: projectDir, env });

  const globalConfigContents = await readFile(paths.globalConfigFile, "utf8");
  const globalConfig = JSON.parse(globalConfigContents) as {
    projects: Array<{ path: string }>;
  };

  expect(globalConfig.projects.some((project) => project.path === projectDir)).toBe(true);

  const projectConfigContents = await readFile(paths.projectConfigFile, "utf8");
  const projectConfig = JSON.parse(projectConfigContents) as {
    repositories: Array<{ name: string }>;
  };

  expect(projectConfig.repositories.some((repository) => repository.name === "local")).toBe(true);

  const gitignoreLines = await readGitignoreLines(projectDir);
  expect(gitignoreLines.has(".skiui/repos")).toBe(true);
  expect(gitignoreLines.has(".skiui/skiui.local.json")).toBe(true);
  expect(gitignoreLines.has(".claude/skills")).toBe(true);
  expect(gitignoreLines.has(".codex/skills")).toBe(true);
  expect(gitignoreLines.has(".opencode/skills")).toBe(true);
  expect(gitignoreLines.has(".cursor/skills")).toBe(true);
  expect(gitignoreLines.has(".roo/skills")).toBe(true);
  expect(gitignoreLines.has("CLAUDE.md")).toBe(true);
  expect(gitignoreLines.has(".clinerules")).toBe(true);
  expect(gitignoreLines.has(".aider.conf.yml")).toBe(true);
  expect(gitignoreLines.has("WARP.md")).toBe(true);
  expect(gitignoreLines.has(".claude")).toBe(false);

  const rulesContents = await readFile(join(projectDir, ".skiui", "AGENTS.md"), "utf8");
  expect(rulesContents).toBe("");

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const dedupedGlobalConfigContents = await readFile(paths.globalConfigFile, "utf8");
  const dedupedGlobalConfig = JSON.parse(dedupedGlobalConfigContents) as {
    projects: Array<{ path: string }>;
  };
  expect(dedupedGlobalConfig.projects.filter((project) => project.path === projectDir)).toHaveLength(1);
});

test("initConfig only ignores assistant skill paths and not assistant roots", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const gitignoreLines = await readGitignoreLines(projectDir);
  expect(gitignoreLines.has(".claude/skills")).toBe(true);
  expect(gitignoreLines.has(".opencode/skills")).toBe(true);
  expect(gitignoreLines.has("CLAUDE.md")).toBe(true);
  expect(gitignoreLines.has(".clinerules")).toBe(true);
  expect(gitignoreLines.has(".claude")).toBe(false);
});

test("loadEffectiveConfig returns merged config in project context", async () => {
  const projectDir = await tempPaths.createTempPath("skiui-project-");
  const globalDir = await tempPaths.createTempPath("skiui-global-");
  const env = createSkiuiTestEnv({ globalDir });

  await initConfig({
    initGlobal: false,
    initProject: true,
    cwd: projectDir,
    env
  });

  const paths = resolveConfigPaths({ cwd: projectDir, env });

  const localConfig = createDefaultProjectConfig();
  localConfig.cachePath = ".skiui/local-cache";
  localConfig.assistants.opencode = "enabled";
  await writeConfigFile(paths.localProjectConfigFile, localConfig);

  const result = await loadEffectiveConfig({ cwd: projectDir, env });

  expect(result.isProjectContext).toBe(true);
  expect(result.config).not.toBeNull();
  expect(result.config?.cachePath).toBe(".skiui/local-cache");
  expect(result.config?.assistants.opencode).toBe("enabled");
});

async function readGitignoreLines(projectDir: string): Promise<Set<string>> {
  const gitignoreContents = await readFile(join(projectDir, ".gitignore"), "utf8");

  return new Set(
    gitignoreContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
}
