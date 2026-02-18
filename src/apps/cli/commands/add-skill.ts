import type { Argv } from "yargs";
import { createNotImplementedHandler } from "./not-implemented";

type AddSkillArgs = {
  sourceType: "git" | "fs";
  skillName: string;
  repository?: string;
  path?: string;
  global?: boolean;
};

export function registerAddSkillCommand(cli: Argv) {
  return cli.command<AddSkillArgs>(
    "add-skill <sourceType> <skillName>",
    "Add a repository source and skill to configuration",
    (command) =>
      command
        .positional("sourceType", {
          choices: ["git", "fs"] as const,
          describe: "Repository source type"
        })
        .positional("skillName", {
          type: "string",
          describe: "Skill name"
        })
        .option("repository", {
          type: "string",
          describe: "Git repository URL (required for git source)"
        })
        .option("path", {
          type: "string",
          describe: "Filesystem source path (required for fs source)"
        })
        .option("global", {
          type: "boolean",
          default: false,
          describe: "Write changes to global configuration"
        })
        .check((args) => {
          if (args.sourceType === "git" && !args.repository) {
            throw new Error("--repository is required for git sources");
          }

          if (args.sourceType === "fs" && !args.path) {
            throw new Error("--path is required for fs sources");
          }

          return true;
        }),
    createNotImplementedHandler("add-skill")
  );
}
