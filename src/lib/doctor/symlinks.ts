import { lstat, rmdir } from "node:fs/promises"
import { dirname, isAbsolute, join, normalize, resolve } from "node:path"
import {
	ASSISTANT_DEFINITIONS,
	type AssistantDefinition,
	getAssistantRulePathsForScope,
	getAssistantSkillPathsForScope,
} from "../assistants/registry"
import type { SkiuiConfig } from "../config/types"
import { removePathIfSymlink } from "../utils/fs"

export type LinkScope = "global" | "project"

export type ManagedLinkPlan = {
	managedSkillDestinations: Set<string>
	activeSkillDestinations: Set<string>
	managedRuleDestinations: Set<string>
	activeRuleDestinations: Set<string>
	managedDestinations: Set<string>
	activeDestinations: Set<string>
	managedCleanupDirectories: Set<string>
}

export function buildManagedLinkPlan(options: {
	scope: LinkScope
	config: SkiuiConfig
	assistantRoot: string
	assistantDefinitions?: readonly AssistantDefinition[]
}): ManagedLinkPlan {
	const assistantDefinitions =
		options.assistantDefinitions ?? ASSISTANT_DEFINITIONS
	const enabledAssistants = assistantDefinitions.filter(
		(assistant) => options.config.assistants[assistant.id] === "enabled",
	)
	const allConfiguredSkills = options.config.repositories.flatMap(
		(repository) => repository.skills,
	)
	const enabledConfiguredSkills = allConfiguredSkills.filter(
		(skill) => skill.enabled,
	)

	const managedSkillDestinations = collectSkillDestinations({
		scope: options.scope,
		assistantRoot: options.assistantRoot,
		assistants: assistantDefinitions,
		skills: allConfiguredSkills,
	})
	const activeSkillDestinations = collectSkillDestinations({
		scope: options.scope,
		assistantRoot: options.assistantRoot,
		assistants: enabledAssistants,
		skills: enabledConfiguredSkills,
	})

	const managedRuleDestinations = collectRuleDestinations({
		scope: options.scope,
		assistantRoot: options.assistantRoot,
		assistants: assistantDefinitions,
	})
	const activeRuleDestinations = collectRuleDestinations({
		scope: options.scope,
		assistantRoot: options.assistantRoot,
		assistants: enabledAssistants,
	})

	return {
		managedSkillDestinations,
		activeSkillDestinations,
		managedRuleDestinations,
		activeRuleDestinations,
		managedDestinations: new Set([
			...managedSkillDestinations,
			...managedRuleDestinations,
		]),
		activeDestinations: new Set([
			...activeSkillDestinations,
			...activeRuleDestinations,
		]),
		managedCleanupDirectories: collectManagedCleanupDirectories({
			scope: options.scope,
			assistantRoot: options.assistantRoot,
			assistants: assistantDefinitions,
		}),
	}
}

export async function pruneManagedSymlinks(options: {
	managedDestinations: Iterable<string>
	activeDestinations: Iterable<string>
	cleanupDirectories?: Iterable<string>
}): Promise<{ removedCount: number }> {
	const managedDestinations = toResolvedSet(options.managedDestinations)
	const activeDestinations = toResolvedSet(options.activeDestinations)
	const cleanupDirectories = toResolvedSet(options.cleanupDirectories ?? [])

	let removedCount = 0

	for (const destinationPath of managedDestinations) {
		if (activeDestinations.has(destinationPath)) {
			continue
		}

		if (await removePathIfSymlink(destinationPath)) {
			removedCount += 1
		}

		await removeEmptyManagedParentDirectories(
			destinationPath,
			cleanupDirectories,
		)
	}

	return { removedCount }
}

export async function removeManagedSymlinks(options: {
	destinations: Iterable<string>
	cleanupDirectories?: Iterable<string>
}): Promise<{ removedCount: number }> {
	const cleanupDirectories = toResolvedSet(options.cleanupDirectories ?? [])
	let removedCount = 0

	for (const destinationPath of toResolvedSet(options.destinations)) {
		if (await removePathIfSymlink(destinationPath)) {
			removedCount += 1
		}

		await removeEmptyManagedParentDirectories(
			destinationPath,
			cleanupDirectories,
		)
	}

	return { removedCount }
}

function collectSkillDestinations(options: {
	scope: LinkScope
	assistantRoot: string
	assistants: readonly AssistantDefinition[]
	skills: Array<{ path: string }>
}): Set<string> {
	const destinations = new Set<string>()

	for (const assistant of options.assistants) {
		for (const assistantPath of getAssistantSkillPathsForScope(
			assistant,
			options.scope,
		)) {
			const destinationBase = isAbsolute(assistantPath)
				? assistantPath
				: join(options.assistantRoot, assistantPath)

			for (const skill of options.skills) {
				destinations.add(resolve(destinationBase, ...skill.path.split("/")))
			}
		}
	}

	return destinations
}

function collectRuleDestinations(options: {
	scope: LinkScope
	assistantRoot: string
	assistants: readonly AssistantDefinition[]
}): Set<string> {
	const destinations = new Set<string>()

	for (const assistant of options.assistants) {
		for (const rulePath of getAssistantRulePathsForScope(
			assistant,
			options.scope,
		)) {
			destinations.add(
				resolve(
					isAbsolute(rulePath)
						? rulePath
						: join(options.assistantRoot, rulePath),
				),
			)
		}
	}

	return destinations
}

function collectManagedCleanupDirectories(options: {
	scope: LinkScope
	assistantRoot: string
	assistants: readonly AssistantDefinition[]
}): Set<string> {
	const directories = new Set<string>()

	for (const assistant of options.assistants) {
		for (const assistantPath of getAssistantSkillPathsForScope(
			assistant,
			options.scope,
		)) {
			if (isAbsolute(assistantPath)) {
				continue
			}

			addRelativeManagedDirectories(
				normalize(assistantPath),
				options.assistantRoot,
				directories,
			)
		}

		for (const rulePath of getAssistantRulePathsForScope(
			assistant,
			options.scope,
		)) {
			if (isAbsolute(rulePath)) {
				continue
			}

			const ruleDirectory = normalize(dirname(rulePath))
			if (ruleDirectory === "." || ruleDirectory.length === 0) {
				continue
			}

			addRelativeManagedDirectories(
				ruleDirectory,
				options.assistantRoot,
				directories,
			)
		}
	}

	return directories
}

async function removeEmptyManagedParentDirectories(
	destinationPath: string,
	managedDirectories: ReadonlySet<string>,
): Promise<void> {
	let current = resolve(dirname(destinationPath))

	while (managedDirectories.has(current)) {
		const removed = await tryRemoveEmptyDirectory(current)

		if (!removed) {
			break
		}

		current = resolve(dirname(current))
	}
}

async function tryRemoveEmptyDirectory(path: string): Promise<boolean> {
	try {
		const stat = await lstat(path)

		if (!stat.isDirectory() || stat.isSymbolicLink()) {
			return false
		}

		await rmdir(path)
		return true
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code

		if (code === "ENOENT") {
			return true
		}

		if (code === "ENOTEMPTY" || code === "EEXIST") {
			return false
		}

		if (code === "ENOTDIR") {
			return false
		}

		throw error
	}
}

function addRelativeManagedDirectories(
	relativePath: string,
	assistantRoot: string,
	directories: Set<string>,
): void {
	const segments = relativePath
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0 && segment !== ".")

	let current = resolve(assistantRoot)

	for (const segment of segments) {
		current = resolve(current, segment)
		directories.add(current)
	}
}

function toResolvedSet(paths: Iterable<string>): Set<string> {
	return new Set(Array.from(paths, (path) => resolve(path)))
}
