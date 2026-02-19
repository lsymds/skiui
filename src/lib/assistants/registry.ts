import type { AssistantStatus } from "../config/types";

export type AssistantDefinition = {
  id: string;
  projectSkillPaths: string[];
  globalSkillPaths: string[];
};

export const ASSISTANT_DEFINITIONS: AssistantDefinition[] = [
  {
    id: "claude-code",
    projectSkillPaths: [".claude/skills"],
    globalSkillPaths: [".claude/skills"]
  },
  {
    id: "opencode",
    projectSkillPaths: [".opencode/skills"],
    globalSkillPaths: [".config/opencode/skills"]
  },
  {
    id: "copilot",
    projectSkillPaths: [".github/instructions"],
    globalSkillPaths: [".github/instructions"]
  },
  {
    id: "cursor",
    projectSkillPaths: [".cursor/rules"],
    globalSkillPaths: [".cursor/rules"]
  },
  {
    id: "windsurf",
    projectSkillPaths: [".windsurf/rules"],
    globalSkillPaths: [".windsurf/rules"]
  },
  {
    id: "continue",
    projectSkillPaths: [".continue/skills"],
    globalSkillPaths: [".continue/skills"]
  },
  {
    id: "aider",
    projectSkillPaths: [".aider/skills"],
    globalSkillPaths: [".aider/skills"]
  },
  {
    id: "cody",
    projectSkillPaths: [".cody/skills"],
    globalSkillPaths: [".cody/skills"]
  },
  {
    id: "cline",
    projectSkillPaths: [".cline/skills"],
    globalSkillPaths: [".cline/skills"]
  },
  {
    id: "roo-code",
    projectSkillPaths: [".roo/rules"],
    globalSkillPaths: [".roo/rules"]
  },
  {
    id: "gemini-cli",
    projectSkillPaths: [".gemini/skills"],
    globalSkillPaths: [".gemini/skills"]
  },
  {
    id: "augment",
    projectSkillPaths: [".augment/rules"],
    globalSkillPaths: [".augment/rules"]
  },
  {
    id: "avante",
    projectSkillPaths: [".avante/rules"],
    globalSkillPaths: [".avante/rules"]
  },
  {
    id: "codeium",
    projectSkillPaths: [".codeium/rules"],
    globalSkillPaths: [".codeium/rules"]
  },
  {
    id: "jetbrains-junie",
    projectSkillPaths: [".junie/skills"],
    globalSkillPaths: [".junie/skills"]
  }
];

export function createDefaultAssistantsConfig(): Record<string, AssistantStatus> {
  return ASSISTANT_DEFINITIONS.reduce<Record<string, AssistantStatus>>((result, assistant) => {
    result[assistant.id] = "disabled";
    return result;
  }, {});
}

export function getAssistantSkillPaths(scope: "project" | "global"): string[] {
  const uniquePaths = new Set<string>();

  for (const assistant of ASSISTANT_DEFINITIONS) {
    const paths = scope === "global" ? assistant.globalSkillPaths : assistant.projectSkillPaths;

    for (const path of paths) {
      uniquePaths.add(path);
    }
  }

  return [...uniquePaths];
}

export function getAssistantPathsForScope(assistant: AssistantDefinition, scope: "project" | "global"): string[] {
  return scope === "global" ? assistant.globalSkillPaths : assistant.projectSkillPaths;
}
