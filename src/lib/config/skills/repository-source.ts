import { basename, normalize } from "node:path";
import { CliError } from "../../utils/errors";
import { normalizeGitUrl } from "../../utils/git";
import type { RepositoryConfig } from "../types";

export function parseRepositorySource(repository: string): RepositoryConfig["source"] {
  const value = repository.trim();

  if (value.length === 0) {
    throw new CliError("Repository is required");
  }

  if (looksLikeGitSource(value)) {
    return {
      type: "git",
      url: normalizeGitUrl(value)
    };
  }

  return {
    type: "fs",
    path: normalizeFsPath(value)
  };
}

export function looksLikeGitSource(source: string): boolean {
  if (/^(https?:\/\/|ssh:\/\/|git:\/\/)/i.test(source)) {
    return true;
  }

  return /^[^@\s]+@[^:\s]+:.+$/.test(source);
}

export function normalizeRepositoryNameInput(repositoryName: string): string {
  const normalized = repositoryName.trim();

  if (normalized.length === 0) {
    throw new CliError("Repository name is required");
  }

  return normalized;
}

export function validateRepositoryNameInput(repositoryName: string): string {
  const normalized = repositoryName.trim();

  if (normalized.length === 0) {
    throw new CliError("Repository name is required");
  }

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new CliError("Repository name must contain only lowercase letters, numbers, '.', '_' or '-'");
  }

  return normalized;
}

export function normalizeSkillName(skillName: string): string {
  const normalized = skillName.trim();

  if (normalized.length === 0) {
    throw new CliError("Skill name is required");
  }

  return normalized;
}

export function isSameSource(repository: RepositoryConfig, source: RepositoryConfig["source"]): boolean {
  if (source.type === "git" && repository.source.type === "git") {
    return repository.source.url === source.url;
  }

  if (source.type === "fs" && repository.source.type === "fs") {
    return repository.source.path === source.path;
  }

  return false;
}

export function inferRepositoryName(source: RepositoryConfig["source"]): string {
  if (source.type === "git") {
    const sourceText = source.url;
    const colonSplit = sourceText.includes(":") ? sourceText.split(":") : [sourceText];
    const finalSegment = colonSplit[colonSplit.length - 1] ?? sourceText;
    const slashSegments = finalSegment.split("/").filter((segment) => segment.length > 0);
    const lastSegment = slashSegments[slashSegments.length - 1] ?? "repository";
    return sanitizeRepositoryName(lastSegment);
  }

  return sanitizeRepositoryName(basename(source.path) || "repository");
}

export function normalizeFsPath(path: string): string {
  const trimmed = path.trim();
  const withoutTrailingSlash = trimmed.replace(/[\\/]+$/, "");
  const normalized = normalize(withoutTrailingSlash.length > 0 ? withoutTrailingSlash : trimmed);
  return normalized.replace(/\\/g, "/");
}

export function sanitizeRepositoryName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return sanitized.length > 0 ? sanitized : "repository";
}

export function allocateRepositoryName(baseName: string, repositories: RepositoryConfig[]): string {
  if (!repositories.some((repository) => repository.name === baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}-${suffix}`;

  while (repositories.some((repository) => repository.name === candidate)) {
    suffix += 1;
    candidate = `${baseName}-${suffix}`;
  }

  return candidate;
}
