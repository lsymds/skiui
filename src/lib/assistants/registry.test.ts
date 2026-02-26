import { expect, test } from "bun:test"
import {
	ASSISTANT_DEFINITIONS,
	createDefaultAssistantsConfig,
	getAssistantRulePaths,
	getAssistantSkillPaths,
} from "./registry"

test("createDefaultAssistantsConfig disables all supported assistants", () => {
	const assistants = createDefaultAssistantsConfig()

	expect(Object.keys(assistants)).toHaveLength(ASSISTANT_DEFINITIONS.length)
	expect(
		Object.values(assistants).every((status) => status === "disabled"),
	).toBe(true)
})

test("getAssistantSkillPaths returns unique project paths", () => {
	const paths = getAssistantSkillPaths("project")
	const uniquePaths = new Set(paths)

	expect(paths.length).toBe(uniquePaths.size)
	expect(paths.includes(".claude/skills")).toBe(true)
	expect(paths.includes(".codex/skills")).toBe(true)
	expect(paths.includes(".opencode/skills")).toBe(true)
	expect(paths.includes(".cursor/skills")).toBe(true)
})

test("getAssistantSkillPaths returns scope-specific global paths", () => {
	const paths = getAssistantSkillPaths("global")
	expect(paths.includes(".opencode/skills")).toBe(true)
	expect(paths.includes(".config/opencode/skills")).toBe(false)
})

test("getAssistantRulePaths returns unique project paths", () => {
	const paths = getAssistantRulePaths("project")
	const uniquePaths = new Set(paths)

	expect(paths.length).toBe(uniquePaths.size)
	expect(paths.includes("CLAUDE.md")).toBe(true)
	expect(paths.includes("AGENTS.md")).toBe(true)
	expect(paths.includes(".clinerules")).toBe(true)
})

test("all assistants define explicit global rule paths", () => {
	expect(
		ASSISTANT_DEFINITIONS.every(
			(assistant) => assistant.globalRulePaths.length > 0,
		),
	).toBe(true)
})

test("getAssistantRulePaths returns scope-specific global paths", () => {
	const paths = getAssistantRulePaths("global")

	expect(paths.includes(".claude/CLAUDE.md")).toBe(true)
	expect(paths.includes(".opencode/AGENTS.md")).toBe(true)
	expect(paths.includes("CLAUDE.md")).toBe(false)
})
