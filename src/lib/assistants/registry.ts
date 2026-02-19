import type { AssistantStatus } from "../config/types";

export type AssistantDefinition = {
  id: string;
  projectSkillPaths: string[];
  globalSkillPaths: string[];
  projectRulePaths: string[];
  globalRulePaths: string[];
};

export const ASSISTANT_DEFINITIONS: AssistantDefinition[] = [
  {
    id: "agentsmd",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "copilot",
    projectSkillPaths: [".claude/skills"],
    globalSkillPaths: [".claude/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "claude",
    projectSkillPaths: [".claude/skills"],
    globalSkillPaths: [".claude/skills"],
    projectRulePaths: ["CLAUDE.md"],
    globalRulePaths: ["CLAUDE.md"]
  },
  {
    id: "codex",
    projectSkillPaths: [".codex/skills"],
    globalSkillPaths: [".codex/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "pi",
    projectSkillPaths: [".pi/skills"],
    globalSkillPaths: [".pi/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "jules",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "cursor",
    projectSkillPaths: [".cursor/skills"],
    globalSkillPaths: [".cursor/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "windsurf",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "cline",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".clinerules"],
    globalRulePaths: [".clinerules"]
  },
  {
    id: "crush",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["CRUSH.md"],
    globalRulePaths: ["CRUSH.md"]
  },
  {
    id: "amp",
    projectSkillPaths: [".agents/skills"],
    globalSkillPaths: [".agents/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "antigravity",
    projectSkillPaths: [".agent/skills"],
    globalSkillPaths: [".agent/skills"],
    projectRulePaths: [".agent/rules/ruler.md"],
    globalRulePaths: [".agent/rules/ruler.md"]
  },
  {
    id: "amazonqcli",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".amazonq/rules/ruler_q_rules.md"],
    globalRulePaths: [".amazonq/rules/ruler_q_rules.md"]
  },
  {
    id: "aider",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md", ".aider.conf.yml"],
    globalRulePaths: ["AGENTS.md", ".aider.conf.yml"]
  },
  {
    id: "firebase",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".idx/airules.md"],
    globalRulePaths: [".idx/airules.md"]
  },
  {
    id: "openhands",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".openhands/microagents/repo.md"],
    globalRulePaths: [".openhands/microagents/repo.md"]
  },
  {
    id: "gemini-cli",
    projectSkillPaths: [".gemini/skills"],
    globalSkillPaths: [".gemini/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "junie",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".junie/guidelines.md"],
    globalRulePaths: [".junie/guidelines.md"]
  },
  {
    id: "augmentcode",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".augment/rules/ruler_augment_instructions.md"],
    globalRulePaths: [".augment/rules/ruler_augment_instructions.md"]
  },
  {
    id: "kilocode",
    projectSkillPaths: [".claude/skills"],
    globalSkillPaths: [".claude/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "opencode",
    projectSkillPaths: [".opencode/skills"],
    globalSkillPaths: [".opencode/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "goose",
    projectSkillPaths: [".agents/skills"],
    globalSkillPaths: [".agents/skills"],
    projectRulePaths: [".goosehints"],
    globalRulePaths: [".goosehints"]
  },
  {
    id: "qwen",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "roo",
    projectSkillPaths: [".roo/skills"],
    globalSkillPaths: [".roo/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "zed",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "trae",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".trae/rules/project_rules.md"],
    globalRulePaths: [".trae/rules/project_rules.md"]
  },
  {
    id: "warp",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["WARP.md"],
    globalRulePaths: ["WARP.md"]
  },
  {
    id: "kiro",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".kiro/steering/ruler_kiro_instructions.md"],
    globalRulePaths: [".kiro/steering/ruler_kiro_instructions.md"]
  },
  {
    id: "firebender",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: ["firebender.json"],
    globalRulePaths: ["firebender.json"]
  },
  {
    id: "factory",
    projectSkillPaths: [".factory/skills"],
    globalSkillPaths: [".factory/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "mistral",
    projectSkillPaths: [".vibe/skills"],
    globalSkillPaths: [".vibe/skills"],
    projectRulePaths: ["AGENTS.md"],
    globalRulePaths: ["AGENTS.md"]
  },
  {
    id: "jetbrains-ai-assistant",
    projectSkillPaths: [],
    globalSkillPaths: [],
    projectRulePaths: [".aiassistant/rules/AGENTS.md"],
    globalRulePaths: [".aiassistant/rules/AGENTS.md"]
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

export function getAssistantRulePaths(scope: "project" | "global"): string[] {
  const uniquePaths = new Set<string>();

  for (const assistant of ASSISTANT_DEFINITIONS) {
    const paths = scope === "global" ? assistant.globalRulePaths : assistant.projectRulePaths;

    for (const path of paths) {
      uniquePaths.add(path);
    }
  }

  return [...uniquePaths];
}

export function getAssistantSkillPathsForScope(assistant: AssistantDefinition, scope: "project" | "global"): string[] {
  return scope === "global" ? assistant.globalSkillPaths : assistant.projectSkillPaths;
}

export function getAssistantRulePathsForScope(assistant: AssistantDefinition, scope: "project" | "global"): string[] {
  return scope === "global" ? assistant.globalRulePaths : assistant.projectRulePaths;
}
