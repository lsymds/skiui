import { access, lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function upsertLines(filePath: string, lines: readonly string[]): Promise<void> {
  const existing = (await pathExists(filePath)) ? await readFile(filePath, "utf8") : "";
  const trailingNewline = existing.endsWith("\n") || existing.length === 0;

  const existingLines = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );

  const missingLines = lines.filter((line) => !existingLines.has(line));

  if (missingLines.length === 0) {
    return;
  }

  const insertionPrefix = existing.length === 0 ? "" : trailingNewline ? "" : "\n";
  const insertion = `${insertionPrefix}${missingLines.join("\n")}\n`;

  await ensureDirectory(dirname(filePath));
  await writeFile(filePath, `${existing}${insertion}`, "utf8");
}

export async function makeSymlink(targetPath: string, linkPath: string): Promise<void> {
  await ensureDirectory(dirname(linkPath));

  if (await pathExists(linkPath)) {
    await rm(linkPath, { recursive: true, force: true });
  }

  const symlinkType = process.platform === "win32" ? "junction" : "dir";
  const normalizedTarget = process.platform === "win32" ? resolve(targetPath) : targetPath;

  await symlink(normalizedTarget, linkPath, symlinkType);
}

export async function isSymlink(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}
