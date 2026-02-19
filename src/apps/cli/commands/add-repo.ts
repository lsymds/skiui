import type { Argv } from "yargs";
import { addRepository } from "../../../lib/config/skills/index";
import { applyConfiguredSkills } from "../../../lib/repos/apply";

type AddRepoArgs = {
  repo: string;
  name?: string;
  global?: boolean;
};

export function registerAddRepoCommand(cli: Argv) {
  return cli.command<AddRepoArgs>(
    "add-repo <repo>",
    "Add a repository source to configuration",
    (command) =>
      command
        .positional("repo", {
          type: "string",
          describe: "Git repository URL or filesystem path"
        })
        .option("global", {
          type: "boolean",
          default: false,
          describe: "Write changes to global configuration"
        })
        .option("name", {
          type: "string",
          describe: "Repository name override (lowercase letters, numbers, '.', '_' or '-')"
        }),
    async (args) => {
      const result = await addRepository({
        repository: args.repo.trim(),
        repositoryName: args.name?.trim(),
        global: args.global ?? false
      });

      if (!result.repositoryAdded) {
        console.log(`Repository \`${result.repositoryName}\` already exists in ${result.scope} config`);
        return;
      }

      await applyConfiguredSkills();

      console.log(`Updated ${result.scope} config: created repository \`${result.repositoryName}\` and applied initial sync`);
    }
  );
}
