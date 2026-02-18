import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDefaultProjectConfig } from "./defaults";
import { resolveConfigPaths, SKIUI_GLOBAL_CONFIG_DIR_ENV } from "./paths";
import { initConfig, loadEffectiveConfig } from "./service";
import { writeConfigFile } from "./store";

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

test("initConfig creates project and global files and registers project", async () => {
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

  const gitignoreContents = await readFile(join(projectDir, ".gitignore"), "utf8");
  expect(gitignoreContents.includes(".skiui/repos")).toBe(true);
  expect(gitignoreContents.includes(".skiui/skiui.local.json")).toBe(true);
  expect(gitignoreContents.includes(".claude/skills")).toBe(true);
  expect(gitignoreContents.includes(".opencode/skills")).toBe(true);
  expect(gitignoreContents.includes(".cursor/rules")).toBe(true);
  expect(gitignoreContents.includes(".github/instructions")).toBe(true);

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

test("loadEffectiveConfig returns merged config in project context", async () => {
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
