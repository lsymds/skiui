import { cloneRepository } from "../utils/clone"
import {
	CONFIG_VERSION,
	type RepositoryConfig,
	type SkillConfig,
	type SkiuiConfig,
} from "./types"

export function mergeConfigLayers(
	globalConfig: SkiuiConfig,
	projectConfig?: SkiuiConfig | null,
	localConfig?: SkiuiConfig | null,
): SkiuiConfig {
	const effectiveProject = projectConfig ?? null
	const effectiveLocal = localConfig ?? null

	const cachePath =
		effectiveLocal?.cachePath ??
		effectiveProject?.cachePath ??
		globalConfig.cachePath
	const rulesPath =
		effectiveLocal?.rulesPath ??
		effectiveProject?.rulesPath ??
		globalConfig.rulesPath
	const assistants = {
		...globalConfig.assistants,
		...(effectiveProject?.assistants ?? {}),
		...(effectiveLocal?.assistants ?? {}),
	}

	const repositories = mergeRepositories(
		globalConfig.repositories,
		effectiveProject?.repositories ?? [],
		effectiveLocal?.repositories ?? [],
	)

	return {
		version: CONFIG_VERSION,
		cachePath,
		rulesPath,
		assistants,
		repositories,
		projects: globalConfig.projects ?? [],
	}
}

function mergeRepositories(
	...layers: RepositoryConfig[][]
): RepositoryConfig[] {
	const byName = new Map<string, RepositoryConfig>()

	for (const repositories of layers) {
		for (const repository of repositories) {
			const current = byName.get(repository.name)

			if (!current) {
				byName.set(repository.name, cloneRepository(repository))
				continue
			}

			byName.set(repository.name, {
				name: repository.name,
				source: repository.source,
				skills: mergeSkills(current.skills, repository.skills),
			})
		}
	}

	return [...byName.values()]
}

function mergeSkills(
	baseSkills: SkillConfig[],
	overrideSkills: SkillConfig[],
): SkillConfig[] {
	const byPath = new Map<string, SkillConfig>(
		baseSkills.map((skill) => [skill.path, { ...skill }]),
	)

	for (const skill of overrideSkills) {
		const current = byPath.get(skill.path)

		if (!current) {
			byPath.set(skill.path, { ...skill })
			continue
		}

		byPath.set(skill.path, {
			...current,
			...skill,
		})
	}

	return [...byPath.values()]
}
