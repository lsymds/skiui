import type { Argv } from "yargs"
import { disableSkill, enableSkill } from "../../../lib/config/skills/index"
import type { ConfigScope } from "../../../lib/projects/types"

type SkillArgs = {
	repositoryName: string
	skillName: string
	scope?: ConfigScope
}

const SCOPE_CHOICES = ["local", "project", "global"] as const

export function registerSkillCommand(cli: Argv) {
	return cli.command(
		"skill <command>",
		"Manage skills in repositories",
		(command) =>
			command
				.command<SkillArgs>(
					"enable <repositoryName> <skillName>",
					"Enable a skill in a configured repository",
					(subcommand) =>
						subcommand
							.positional("repositoryName", {
								type: "string",
								describe: "Configured repository name",
							})
							.positional("skillName", {
								type: "string",
								describe: "Skill name",
							})
							.option("scope", {
								type: "string",
								choices: SCOPE_CHOICES,
								describe:
									"Write changes to local, project, or global configuration",
							}),
					async (args) => {
						const result = await enableSkill({
							repositoryName: args.repositoryName.trim(),
							skillName: args.skillName.trim(),
							scope: args.scope,
						})

						if (!result.skillAdded && !result.skillEnabled) {
							console.log(
								`Skill \`${args.skillName}\` already enabled in repository \`${result.repositoryName}\` (${result.scope})`,
							)
							return
						}

						if (result.skillAdded) {
							console.log(
								`Updated ${result.scope} config: added skill \`${args.skillName}\` to repository \`${result.repositoryName}\``,
							)
							return
						}

						console.log(
							`Updated ${result.scope} config: enabled skill \`${args.skillName}\` in repository \`${result.repositoryName}\``,
						)
					},
				)
				.command<SkillArgs>(
					"disable <repositoryName> <skillName>",
					"Disable a skill in a configured repository",
					(subcommand) =>
						subcommand
							.positional("repositoryName", {
								type: "string",
								describe: "Configured repository name",
							})
							.positional("skillName", {
								type: "string",
								describe: "Skill name",
							})
							.option("scope", {
								type: "string",
								choices: SCOPE_CHOICES,
								describe:
									"Write changes to local, project, or global configuration",
							}),
					async (args) => {
						const result = await disableSkill({
							repositoryName: args.repositoryName.trim(),
							skillName: args.skillName.trim(),
							scope: args.scope,
						})

						if (!result.skillDisabled) {
							console.log(
								`Skill \`${args.skillName}\` already disabled in repository \`${result.repositoryName}\` (${result.scope})`,
							)
							return
						}

						console.log(
							`Updated ${result.scope} config: disabled skill \`${args.skillName}\` in repository \`${result.repositoryName}\``,
						)
					},
				)
				.demandCommand(1, "A command is required")
				.strict(),
		() => {},
	)
}
