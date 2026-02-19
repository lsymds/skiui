import { expect, test } from "bun:test";
import { ASSISTANT_DEFINITIONS, createDefaultAssistantsConfig, getAssistantSkillPaths } from "./registry";

test("createDefaultAssistantsConfig disables all supported assistants", () => {
  const assistants = createDefaultAssistantsConfig();

  expect(Object.keys(assistants)).toHaveLength(ASSISTANT_DEFINITIONS.length);
  expect(Object.values(assistants).every((status) => status === "disabled")).toBe(true);
});

test("getAssistantSkillPaths returns unique project paths", () => {
  const paths = getAssistantSkillPaths("project");
  const uniquePaths = new Set(paths);

  expect(paths.length).toBe(uniquePaths.size);
  expect(paths.includes(".claude/skills")).toBe(true);
  expect(paths.includes(".opencode/skills")).toBe(true);
  expect(paths.includes(".cursor/rules")).toBe(true);
});

test("getAssistantSkillPaths returns scope-specific global paths", () => {
  const paths = getAssistantSkillPaths("global");
  expect(paths.includes(".config/opencode/skills")).toBe(true);
  expect(paths.includes(".opencode/skills")).toBe(false);
});

test("all assistants define explicit global paths", () => {
  expect(ASSISTANT_DEFINITIONS.every((assistant) => assistant.globalSkillPaths.length > 0)).toBe(true);
});
