import type { RepositorySource } from "../repos/types";

export const CONFIG_VERSION = 1 as const;
export const DEFAULT_RULES_PATH = ".skiui/AGENTS.md";

export type AssistantStatus = "enabled" | "disabled";

export type SkillConfig = {
  path: string;
  name: string;
  description?: string;
  enabled: boolean;
};

export type RepositoryConfig = {
  name: string;
  lastRefreshed?: string;
  lastFetched?: string;
  source: RepositorySource;
  skills: SkillConfig[];
};

export type ProjectRecord = {
  path: string;
  lastRefreshed?: string;
  lastFetched?: string;
};

export type SkiuiConfig = {
  version: typeof CONFIG_VERSION;
  cachePath: string;
  rulesPath?: string;
  assistants: Record<string, AssistantStatus>;
  repositories: RepositoryConfig[];
  projects?: ProjectRecord[];
};
