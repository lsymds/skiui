import type { Argv } from "yargs";
import { addRepository } from "../../../lib/config/skills/index";
import { applyConfiguredSkills } from "../../../lib/repos/apply";
import type { ConfigScope } from "../../../lib/projects/types";

type AddRepoArgs = {
  repo: string;
  name?: string;
  scope?: ConfigScope;
};

const SCOPE_CHOICES = ["local", "project", "global"] as const;

export function registerAddRepoCommand(cli: Argv) {
  return cli.command(
    "repo <command>",
    "Manage repository sources",
    (command) =>
      command
        .command<AddRepoArgs>(
          "add <repo>",
          "Add a repository source to configuration",
          (subcommand) =>
            subcommand
              .positional("repo", {
                type: "string",
                describe: "Git repository URL or filesystem path"
              })
              .option("scope", {
                type: "string",
                choices: SCOPE_CHOICES,
                describe: "Write changes to local, project, or global configuration"
              })
              .option("name", {
                type: "string",
                describe: "Repository name override (lowercase letters, numbers, '.', '_' or '-')"
              }),
          async (args) => {
            const result = await addRepository({
              repository: args.repo.trim(),
              repositoryName: args.name?.trim(),
              scope: args.scope
            });

            if (!result.repositoryAdded) {
              console.log(`Repository \`${result.repositoryName}\` already exists in ${result.scope} config`);
              return;
            }

            await applyConfiguredSkills();

            console.log(
              `Updated ${result.scope} config: created repository \`${result.repositoryName}\` and applied initial sync`
            );
          }
        )
        .demandCommand(1, "A command is required")
        .strict(),
    () => {}
  );
}
