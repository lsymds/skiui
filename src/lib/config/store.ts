import { readFile } from "node:fs/promises";
import type { SkiuiConfig } from "./types";
import { parseSkiuiConfig } from "./validation";
import { pathExists, writeJsonFile } from "../utils/fs";
import { CliError } from "../utils/errors";

export async function loadConfigFile(filePath: string): Promise<SkiuiConfig | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const rawContents = await readFile(filePath, "utf8");
  let rawConfig: unknown;

  try {
    rawConfig = JSON.parse(rawContents) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown parse error";
    throw new CliError(`Invalid JSON in ${filePath}: ${message}`);
  }

  return parseSkiuiConfig(rawConfig, filePath);
}

export async function writeConfigFile(filePath: string, config: SkiuiConfig): Promise<void> {
  await writeJsonFile(filePath, config);
}
