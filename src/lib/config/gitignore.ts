import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, normalize, relative } from "node:path";
import {
  getAssistantRulePaths,
  getAssistantSkillPaths,
} from "../assistants/registry";
import { pathExists, upsertLines } from "../utils/fs";
import { DEFAULT_RULES_PATH, type SkiuiConfig } from "./types";

export async function reconcileProjectGitIgnoreLines(options: {
  cwd: string;
  config: SkiuiConfig;
}): Promise<void> {
  const gitignorePath = join(options.cwd, ".gitignore");
  const plan = resolveProjectGitIgnorePlan(options);

  await removeProtectedGitIgnoreLines(gitignorePath, plan.protectedPaths);
  await upsertLines(gitignorePath, plan.missingLines);
}

function resolveProjectGitIgnorePlan(options: {
  cwd: string;
  config: SkiuiConfig;
}): {
  missingLines: string[];
  protectedPaths: Set<string>;
} {
  const candidates = new Set<string>();
  const protectedPaths = new Set<string>();

  candidates.add(".skiui/skiui.local.json");

  const normalizedCachePath = normalizePathForProject(
    options.config.cachePath,
    options.cwd,
  );
  if (normalizedCachePath) {
    candidates.add(normalizedCachePath);
  }

  for (const skillPath of getAssistantSkillPaths("project")) {
    const normalizedSkillPath = normalizeGitignorePath(skillPath);
    if (normalizedSkillPath) {
      candidates.add(normalizedSkillPath);
    }
  }

  for (const rulePath of getAssistantRulePaths("project")) {
    const normalizedRulePath = normalizeGitignorePath(rulePath);
    if (normalizedRulePath) {
      candidates.add(normalizedRulePath);
    }
  }

  const effectiveRulesPath =
    options.config.rulesPath?.trim() || DEFAULT_RULES_PATH;
  const normalizedRulesPath = normalizePathForProject(
    effectiveRulesPath,
    options.cwd,
  );
  if (normalizedRulesPath) {
    protectedPaths.add(normalizedRulesPath);
  }

  for (const repository of options.config.repositories) {
    if (repository.source.type !== "fs") {
      continue;
    }

    const normalizedRepositoryPath = normalizePathForProject(
      repository.source.path,
      options.cwd,
    );
    if (normalizedRepositoryPath) {
      protectedPaths.add(normalizedRepositoryPath);
    }
  }

  const missingLines = [...candidates].filter((candidatePath) => {
    for (const protectedPath of protectedPaths) {
      if (pathsOverlap(candidatePath, protectedPath)) {
        return false;
      }
    }

    return true;
  });

  return {
    missingLines,
    protectedPaths,
  };
}

async function removeProtectedGitIgnoreLines(
  gitignorePath: string,
  protectedPaths: Set<string>,
): Promise<void> {
  if (protectedPaths.size === 0 || !(await pathExists(gitignorePath))) {
    return;
  }

  const existing = await readFile(gitignorePath, "utf8");
  const lines = existing.split(/\r?\n/);

  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const filteredLines = lines.filter(
    (line) => !isProtectedGitIgnoreLine(line, protectedPaths),
  );

  if (filteredLines.length === lines.length) {
    return;
  }

  const nextContents =
    filteredLines.length === 0 ? "" : `${filteredLines.join("\n")}\n`;
  await writeFile(gitignorePath, nextContents, "utf8");
}

function isProtectedGitIgnoreLine(
  line: string,
  protectedPaths: Set<string>,
): boolean {
  const trimmedLine = line.trim();

  if (
    trimmedLine.length === 0 ||
    trimmedLine.startsWith("#") ||
    trimmedLine.startsWith("!")
  ) {
    return false;
  }

  const normalizedPath = normalizeGitignorePath(trimmedLine);
  return normalizedPath !== null && protectedPaths.has(normalizedPath);
}

function normalizePathForProject(path: string, cwd: string): string | null {
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    return null;
  }

  if (isAbsolute(trimmedPath)) {
    const projectRelativePath = relative(cwd, trimmedPath);

    if (
      projectRelativePath.length === 0 ||
      projectRelativePath === "." ||
      projectRelativePath.startsWith("..") ||
      isAbsolute(projectRelativePath)
    ) {
      return null;
    }

    return normalizeGitignorePath(projectRelativePath);
  }

  return normalizeGitignorePath(trimmedPath);
}

function normalizeGitignorePath(path: string): string | null {
  const normalizedPath = normalize(path.trim())
    .replace(/\\/g, "/")
    .replace(/^\.\/+/u, "")
    .replace(/\/+$/u, "");

  if (normalizedPath.length === 0 || normalizedPath === ".") {
    return null;
  }

  return normalizedPath;
}

function pathsOverlap(leftPath: string, rightPath: string): boolean {
  return (
    leftPath === rightPath ||
    leftPath.startsWith(`${rightPath}/`) ||
    rightPath.startsWith(`${leftPath}/`)
  );
}
