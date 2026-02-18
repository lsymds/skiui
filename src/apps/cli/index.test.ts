import { afterEach, expect, test } from "bun:test";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SKIUI_GLOBAL_CONFIG_DIR_ENV } from "../../lib/config/paths";

const CLI_ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));
const tempPaths: string[] = [];

async function createTempPath(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempPaths.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0, tempPaths.length).map((path) => rm(path, { recursive: true, force: true })));
});

test("cli init defaults to project scope", async () => {
  const projectDir = await createTempPath("skiui-cli-project-");
  const globalDir = await createTempPath("skiui-cli-global-");

  const result = await runCli(["init"], {
    cwd: projectDir,
    env: {
      ...process.env,
      [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
    }
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Initialized project and global configuration");
  expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(true);
  expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true);
});

test("cli init --global only creates global configuration", async () => {
  const projectDir = await createTempPath("skiui-cli-project-");
  const globalDir = await createTempPath("skiui-cli-global-");

  const result = await runCli(["init", "--global"], {
    cwd: projectDir,
    env: {
      ...process.env,
      [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
    }
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Initialized global configuration");
  expect(await fileExists(join(projectDir, ".skiui", "skiui.json"))).toBe(false);
  expect(await fileExists(join(globalDir, "skiui.json"))).toBe(true);
});

test("cli config returns merged project config", async () => {
  const projectDir = await createTempPath("skiui-cli-project-");
  const globalDir = await createTempPath("skiui-cli-global-");

  const env = {
    ...process.env,
    [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
  };

  const initResult = await runCli(["init"], { cwd: projectDir, env });
  expect(initResult.exitCode).toBe(0);

  const localConfigPath = join(projectDir, ".skiui", "skiui.local.json");
  await writeFile(
    localConfigPath,
    JSON.stringify(
      {
        version: 1,
        cachePath: ".skiui/local-cache",
        assistants: {
          opencode: "enabled"
        },
        repositories: []
      },
      null,
      2
    ),
    "utf8"
  );

  const configResult = await runCli(["config"], { cwd: projectDir, env });

  expect(configResult.exitCode).toBe(0);

  const parsed = JSON.parse(configResult.stdout) as {
    cachePath: string;
    assistants: Record<string, string>;
  };

  expect(parsed.cachePath).toBe(".skiui/local-cache");
  expect(parsed.assistants.opencode).toBe("enabled");
});

test("cli config errors when no config is present", async () => {
  const projectDir = await createTempPath("skiui-cli-project-");
  const globalDir = await createTempPath("skiui-cli-global-");

  const result = await runCli(["config"], {
    cwd: projectDir,
    env: {
      ...process.env,
      [SKIUI_GLOBAL_CONFIG_DIR_ENV]: globalDir
    }
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("No skiui configuration found. Run `skiui init` first.");
});

async function runCli(
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
  }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const processHandle = Bun.spawn({
    cmd: [process.execPath, "run", CLI_ENTRY, ...args],
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe"
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    processHandle.exited,
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text()
  ]);

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim()
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
