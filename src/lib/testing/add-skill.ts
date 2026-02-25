import type { ConfigScope } from "../projects/types";
import { addRepository, enableSkill } from "../config/skills/index";
import { CliError } from "../utils/errors";

export type AddSkillOptions = {
  sourceType: "git" | "fs";
  skillName: string;
  repositoryUrl?: string;
  sourcePath?: string;
  scope?: ConfigScope;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type AddSkillResult = {
  scope: ConfigScope;
  configPath: string;
  repositoryName: string;
  repositoryAdded: boolean;
  skillAdded: boolean;
};

/**
 * Test-only convenience that combines addRepository + enableSkill into a single call.
 */
export async function addSkill(options: AddSkillOptions): Promise<AddSkillResult> {
  const repository =
    options.sourceType === "git"
      ? options.repositoryUrl?.trim()
      : options.sourcePath?.trim();

  if (!repository) {
    throw new CliError(
      options.sourceType === "git" ? "--repository is required for git sources" : "--path is required for fs sources"
    );
  }

  const repoResult = await addRepository({
    repository,
    scope: options.scope,
    cwd: options.cwd,
    env: options.env
  });

  const skillResult = await enableSkill({
    repositoryName: repoResult.repositoryName,
    skillName: options.skillName,
    scope: options.scope,
    cwd: options.cwd,
    env: options.env
  });

  return {
    scope: skillResult.scope,
    configPath: skillResult.configPath,
    repositoryName: repoResult.repositoryName,
    repositoryAdded: repoResult.repositoryAdded,
    skillAdded: skillResult.skillAdded
  };
}
