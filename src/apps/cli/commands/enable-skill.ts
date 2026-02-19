import type { Argv } from "yargs";
import { enableSkill } from "../../../lib/config/skills/index";

type EnableSkillArgs = {
  repositoryName: string;
  skillName: string;
  global?: boolean;
};

export function registerEnableSkillCommand(cli: Argv) {
  return cli.command<EnableSkillArgs>(
    "enable-skill <repositoryName> <skillName>",
    "Enable a skill in a configured repository",
    (command) =>
      command
        .positional("repositoryName", {
          type: "string",
          describe: "Configured repository name"
        })
        .positional("skillName", {
          type: "string",
          describe: "Skill name"
        })
        .option("global", {
          type: "boolean",
          default: false,
          describe: "Write changes to global configuration"
        }),
    async (args) => {
      const result = await enableSkill({
        repositoryName: args.repositoryName.trim(),
        skillName: args.skillName.trim(),
        global: args.global ?? false
      });

      if (!result.skillAdded && !result.skillEnabled) {
        console.log(
          `Skill \`${args.skillName}\` already enabled in repository \`${result.repositoryName}\` (${result.scope})`
        );
        return;
      }

      if (result.skillAdded) {
        console.log(
          `Updated ${result.scope} config: added skill \`${args.skillName}\` to repository \`${result.repositoryName}\``
        );
        return;
      }

      console.log(`Updated ${result.scope} config: enabled skill \`${args.skillName}\` in repository \`${result.repositoryName}\``);
    }
  );
}
