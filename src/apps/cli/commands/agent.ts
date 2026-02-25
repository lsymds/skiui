import type { Argv } from "yargs";
import { disableAssistant, enableAssistant } from "../../../lib/config/assistants";
import type { ConfigScope } from "../../../lib/projects/types";

type AgentArgs = {
  assistantId: string;
  scope?: ConfigScope;
};

const SCOPE_CHOICES = ["local", "project", "global"] as const;

export function registerAgentCommand(cli: Argv) {
  return cli.command(
    "agent <command>",
    "Enable or disable assistants",
    (command) =>
      command
        .command<AgentArgs>(
          "enable <assistantId>",
          "Enable an assistant in configuration",
          (subcommand) =>
            subcommand
              .positional("assistantId", {
                type: "string",
                describe: "Assistant id"
              })
              .option("scope", {
                type: "string",
                choices: SCOPE_CHOICES,
                describe: "Write changes to local, project, or global configuration"
              }),
          async (args) => {
            const result = await enableAssistant({
              assistantId: args.assistantId,
              scope: args.scope
            });

            if (!result.statusChanged) {
              console.log(`Assistant \`${result.assistantId}\` already enabled in ${result.scope} config`);
              return;
            }

            console.log(`Updated ${result.scope} config: enabled assistant \`${result.assistantId}\``);
          }
        )
        .command<AgentArgs>(
          "disable <assistantId>",
          "Disable an assistant in configuration",
          (subcommand) =>
            subcommand
              .positional("assistantId", {
                type: "string",
                describe: "Assistant id"
              })
              .option("scope", {
                type: "string",
                choices: SCOPE_CHOICES,
                describe: "Write changes to local, project, or global configuration"
              }),
          async (args) => {
            const result = await disableAssistant({
              assistantId: args.assistantId,
              scope: args.scope
            });

            if (!result.statusChanged) {
              console.log(`Assistant \`${result.assistantId}\` already disabled in ${result.scope} config`);
              return;
            }

            console.log(`Updated ${result.scope} config: disabled assistant \`${result.assistantId}\``);
          }
        )
        .demandCommand(1, "A command is required")
        .strict(),
    () => {}
  );
}
