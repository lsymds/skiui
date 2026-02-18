import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CLI_ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));

export async function runCli(
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

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
