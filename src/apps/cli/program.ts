import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { registerAddSkillCommand } from "./commands/add-skill";
import { registerApplyCommand } from "./commands/apply";
import { registerConfigCommand } from "./commands/config";
import { registerInitCommand } from "./commands/init";
import { registerListCommand } from "./commands/list";

export function buildCli() {
  const cli = yargs(hideBin(process.argv))
    .scriptName("skiui")
    .usage("$0 <command>")
    .strict()
    .recommendCommands()
    .demandCommand(1, "A command is required")
    .help()
    .alias("h", "help")
    .version("0.1.0");

  registerInitCommand(cli);
  registerAddSkillCommand(cli);
  registerApplyCommand(cli);
  registerListCommand(cli);
  registerConfigCommand(cli);

  return cli;
}
