import type { Argv } from "yargs"
import { loadEffectiveConfig } from "../../../lib/config/service"
import { CliError } from "../../../lib/utils/errors"

export function registerConfigCommand(cli: Argv) {
	return cli.command(
		"config",
		"Print effective skiui configuration",
		() => {},
		async () => {
			const result = await loadEffectiveConfig()

			if (!result.config) {
				throw new CliError(
					"No skiui configuration found. Run `skiui init` first.",
				)
			}

			const configToPrint = { ...result.config }

			if (result.isProjectContext) {
				delete configToPrint.projects
			}

			console.log(JSON.stringify(configToPrint, null, 2))
		},
	)
}
