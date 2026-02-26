import type { Argv } from "yargs"
import { initConfig } from "../../../lib/config/service"
import type { ConfigScope } from "../../../lib/projects/types"

type InitArgs = {
	scope?: ConfigScope
}

const SCOPE_CHOICES = ["local", "project", "global"] as const

export function registerInitCommand(cli: Argv) {
	return cli.command<InitArgs>(
		"init",
		"Initialise skiui folders and configuration",
		(command) =>
			command.option("scope", {
				type: "string",
				choices: SCOPE_CHOICES,
				describe: "Initialise local, project, or global configuration",
			}),
		async (args) => {
			const scope = args.scope ?? "project"

			const result = await initConfig({
				initGlobal: scope === "global",
				initProject: scope === "project" || scope === "local",
				initLocal: scope === "local",
			})

			const initializedScopes: string[] = []

			if (result.localConfigPath) {
				initializedScopes.push("local")
			}

			if (result.projectConfigPath) {
				initializedScopes.push("project")
			}

			if (result.globalConfigPath) {
				initializedScopes.push("global")
			}

			console.log(
				`Initialized ${initializedScopes.join(" and ")} configuration`,
			)
		},
	)
}
