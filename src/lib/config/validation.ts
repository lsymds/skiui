import { z } from "zod"
import { CliError } from "../utils/errors"
import { CONFIG_VERSION, type SkiuiConfig } from "./types"

export class ConfigValidationError extends CliError {
	constructor(message: string) {
		super(message, 1)
		this.name = "ConfigValidationError"
	}
}

const assistantStatusSchema = z.enum(["enabled", "disabled"])

const skillSchema = z.object({
	path: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	enabled: z.boolean(),
})

const repositorySourceSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("git"),
		url: z.string().min(1),
		path: z.string().optional(),
		branch: z.string().optional(),
	}),
	z.object({
		type: z.literal("fs"),
		path: z.string().min(1),
	}),
])

const repositorySchema = z.object({
	name: z.string().min(1),
	lastRefreshed: z.string().optional(),
	lastFetched: z.string().optional(),
	source: repositorySourceSchema,
	skills: z.array(skillSchema),
})

const projectRecordSchema = z.object({
	path: z.string().min(1),
	lastRefreshed: z.string().optional(),
	lastFetched: z.string().optional(),
})

const skiuiConfigSchema = z.object({
	version: z.literal(CONFIG_VERSION),
	cachePath: z.string().min(1),
	rulesPath: z.string().min(1).optional(),
	assistants: z.record(z.string(), assistantStatusSchema),
	repositories: z.array(repositorySchema),
	projects: z.array(projectRecordSchema).optional(),
})

export function parseSkiuiConfig(
	rawConfig: unknown,
	sourceLabel: string,
): SkiuiConfig {
	const parsed = skiuiConfigSchema.safeParse(rawConfig)

	if (!parsed.success) {
		const details = parsed.error.issues
			.map((issue) => {
				const field = issue.path.length > 0 ? issue.path.join(".") : "root"
				return `${field}: ${issue.message}`
			})
			.join("; ")

		throw new ConfigValidationError(
			`Invalid config in ${sourceLabel}: ${details}`,
		)
	}

	return parsed.data
}
