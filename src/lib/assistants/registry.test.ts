import { expect, test } from "bun:test";
import { ASSISTANT_DEFINITIONS, createDefaultAssistantsConfig, getAssistantSkillPaths } from "./registry";

test("createDefaultAssistantsConfig disables all supported assistants", () => {
  const assistants = createDefaultAssistantsConfig();

  expect(Object.keys(assistants)).toHaveLength(ASSISTANT_DEFINITIONS.length);
  expect(Object.values(assistants).every((status) => status === "disabled")).toBe(true);
});

test("getAssistantSkillPaths returns unique path list", () => {
  const paths = getAssistantSkillPaths();
  const uniquePaths = new Set(paths);

  expect(paths.length).toBe(uniquePaths.size);
  expect(paths.includes(".claude/skills")).toBe(true);
  expect(paths.includes(".opencode/skills")).toBe(true);
  expect(paths.includes(".cursor/rules")).toBe(true);
});
