import type { AssistantStatus } from "../config/types";

export type AssistantDefinition = {
  id: string;
  skillPaths: string[];
};

export const ASSISTANT_DEFINITIONS: AssistantDefinition[] = [
  {
    id: "claude-code",
    skillPaths: [".claude/skills"]
  },
  {
    id: "opencode",
    skillPaths: [".opencode/skills"]
  },
  {
    id: "copilot",
    skillPaths: [".github/instructions"]
  },
  {
    id: "cursor",
    skillPaths: [".cursor/rules"]
  },
  {
    id: "windsurf",
    skillPaths: [".windsurf/rules"]
  },
  {
    id: "continue",
    skillPaths: [".continue/skills"]
  },
  {
    id: "aider",
    skillPaths: [".aider/skills"]
  },
  {
    id: "cody",
    skillPaths: [".cody/skills"]
  },
  {
    id: "cline",
    skillPaths: [".cline/skills"]
  },
  {
    id: "roo-code",
    skillPaths: [".roo/rules"]
  },
  {
    id: "gemini-cli",
    skillPaths: [".gemini/skills"]
  },
  {
    id: "augment",
    skillPaths: [".augment/rules"]
  },
  {
    id: "avante",
    skillPaths: [".avante/rules"]
  },
  {
    id: "codeium",
    skillPaths: [".codeium/rules"]
  },
  {
    id: "jetbrains-junie",
    skillPaths: [".junie/skills"]
  }
];

export function createDefaultAssistantsConfig(): Record<string, AssistantStatus> {
  return ASSISTANT_DEFINITIONS.reduce<Record<string, AssistantStatus>>((result, assistant) => {
    result[assistant.id] = "disabled";
    return result;
  }, {});
}

export function getAssistantSkillPaths(): string[] {
  const uniquePaths = new Set<string>();

  for (const assistant of ASSISTANT_DEFINITIONS) {
    for (const path of assistant.skillPaths) {
      uniquePaths.add(path);
    }
  }

  return [...uniquePaths];
}
