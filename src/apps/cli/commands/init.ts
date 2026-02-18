import type { Argv } from "yargs";
import { initConfig } from "../../../lib/config/service";

type InitArgs = {
  global?: boolean;
};

export function registerInitCommand(cli: Argv) {
  return cli.command<InitArgs>(
    "init",
    "Initialise skiui folders and configuration",
    (command) =>
      command
        .option("global", {
          type: "boolean",
          describe: "Initialise global skiui configuration"
        }),
    async (args) => {
      const globalOnly = args.global ?? false;

      const result = await initConfig({
        initGlobal: globalOnly,
        initProject: !globalOnly
      });

      const initializedScopes: string[] = [];

      if (result.projectConfigPath) {
        initializedScopes.push("project");
      }

      if (result.globalConfigPath) {
        initializedScopes.push("global");
      }

      console.log(`Initialized ${initializedScopes.join(" and ")} configuration`);
    }
  );
}
