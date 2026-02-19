import { dirname, join, relative } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { pathExists } from "../utils/fs";

export type DiscoveredSkill = {
  path: string;
  name: string;
  description?: string;
};

export async function discoverSkills(skillRootPath: string): Promise<DiscoveredSkill[]> {
  if (!(await pathExists(skillRootPath))) {
    return [];
  }

  const skillFiles: string[] = [];
  await collectSkillFiles(skillRootPath, skillFiles);

  const skills: DiscoveredSkill[] = [];

  for (const skillFile of skillFiles) {
    const skillDirectory = dirname(skillFile);
    const relativeDirectory = toConfigPath(relative(skillRootPath, skillDirectory));

    if (relativeDirectory.length === 0) {
      continue;
    }

    const metadata = await parseSkillMetadata(skillFile, relativeDirectory);
    skills.push({
      path: relativeDirectory,
      name: metadata.name,
      description: metadata.description
    });
  }

  skills.sort((left, right) => left.path.localeCompare(right.path));
  return skills;
}

async function collectSkillFiles(directory: string, files: string[]): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectSkillFiles(entryPath, files);
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(entryPath);
    }
  }
}

async function parseSkillMetadata(skillFilePath: string, fallbackName: string): Promise<{ name: string; description?: string }> {
  const contents = await readFile(skillFilePath, "utf8");
  const frontmatter = extractFrontmatter(contents);
  const body = frontmatter ? contents.slice(frontmatter.blockLength) : contents;

  const headingMatch = body.match(/^#\s+(.+)$/m);
  const name = headingMatch?.[1]?.trim() || frontmatter?.metadata.name || fallbackName;

  const description = frontmatter?.metadata.description ?? findFirstDescriptionLine(body);

  return {
    name,
    description
  };
}

function extractFrontmatter(contents: string): {
  metadata: { name?: string; description?: string };
  blockLength: number;
} | null {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match || !match[0] || match[1] === undefined) {
    return null;
  }

  const metadata = parseSimpleFrontmatter(match[1]);

  return {
    metadata,
    blockLength: match[0].length
  };
}

function parseSimpleFrontmatter(frontmatter: string): { name?: string; description?: string } {
  const metadata: { name?: string; description?: string } = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const key = match[1]?.toLowerCase();
    const rawValue = match[2];
    if (!key || !rawValue) {
      continue;
    }

    const value = trimQuotedValue(rawValue);

    if (key === "name") {
      metadata.name = value;
    }

    if (key === "description") {
      metadata.description = value;
    }
  }

  return metadata;
}

function trimQuotedValue(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function findFirstDescriptionLine(contents: string): string | undefined {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    return line;
  }

  return undefined;
}

function toConfigPath(path: string): string {
  if (path.length === 0) {
    return path;
  }

  return path.split("\\").join("/");
}
