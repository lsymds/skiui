import type { AssistantStatus } from "../config/types";

export type AssistantDefinition = {
  id: string;
  projectSkillPaths: string[];
  globalSkillPaths: string[];
  projectRulePaths: string[];
  globalRulePaths: string[];
};

type AssistantDefinitionInput = {
  skillPaths?: string[];
  rulePaths?: string[];
  projectSkillPaths?: string[];
  globalSkillPaths?: string[];
  projectRulePaths?: string[];
  globalRulePaths?: string[];
};

function defineAssistant(id: string, input: AssistantDefinitionInput): AssistantDefinition {
  const sharedSkillPaths = input.skillPaths ?? [];
  const sharedRulePaths = input.rulePaths ?? [];

  return {
    id,
    projectSkillPaths: input.projectSkillPaths ?? sharedSkillPaths,
    globalSkillPaths: input.globalSkillPaths ?? sharedSkillPaths,
    projectRulePaths: input.projectRulePaths ?? sharedRulePaths,
    globalRulePaths: input.globalRulePaths ?? sharedRulePaths
  };
}

export const ASSISTANT_DEFINITIONS: AssistantDefinition[] = [
  defineAssistant("agentsmd", { rulePaths: ["AGENTS.md"] }),
  defineAssistant("copilot", { skillPaths: [".claude/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("claude", { skillPaths: [".claude/skills"], rulePaths: ["CLAUDE.md"] }),
  defineAssistant("codex", { skillPaths: [".codex/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("pi", { skillPaths: [".pi/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("jules", { rulePaths: ["AGENTS.md"] }),
  defineAssistant("cursor", { skillPaths: [".cursor/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("windsurf", { rulePaths: ["AGENTS.md"] }),
  defineAssistant("cline", { rulePaths: [".clinerules"] }),
  defineAssistant("crush", { rulePaths: ["CRUSH.md"] }),
  defineAssistant("amp", { skillPaths: [".agents/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("antigravity", { skillPaths: [".agent/skills"], rulePaths: [".agent/rules/ruler.md"] }),
  defineAssistant("amazonqcli", { rulePaths: [".amazonq/rules/ruler_q_rules.md"] }),
  defineAssistant("aider", { rulePaths: ["AGENTS.md", ".aider.conf.yml"] }),
  defineAssistant("firebase", { rulePaths: [".idx/airules.md"] }),
  defineAssistant("openhands", { rulePaths: [".openhands/microagents/repo.md"] }),
  defineAssistant("gemini-cli", { skillPaths: [".gemini/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("junie", { rulePaths: [".junie/guidelines.md"] }),
  defineAssistant("augmentcode", { rulePaths: [".augment/rules/ruler_augment_instructions.md"] }),
  defineAssistant("kilocode", { skillPaths: [".claude/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("opencode", { skillPaths: [".opencode/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("goose", { skillPaths: [".agents/skills"], rulePaths: [".goosehints"] }),
  defineAssistant("qwen", { rulePaths: ["AGENTS.md"] }),
  defineAssistant("roo", { skillPaths: [".roo/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("zed", { rulePaths: ["AGENTS.md"] }),
  defineAssistant("trae", { rulePaths: [".trae/rules/project_rules.md"] }),
  defineAssistant("warp", { rulePaths: ["WARP.md"] }),
  defineAssistant("kiro", { rulePaths: [".kiro/steering/ruler_kiro_instructions.md"] }),
  defineAssistant("firebender", { rulePaths: ["firebender.json"] }),
  defineAssistant("factory", { skillPaths: [".factory/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("mistral", { skillPaths: [".vibe/skills"], rulePaths: ["AGENTS.md"] }),
  defineAssistant("jetbrains-ai-assistant", { rulePaths: [".aiassistant/rules/AGENTS.md"] })
];

type Scope = "project" | "global";

export function createDefaultAssistantsConfig(): Record<string, AssistantStatus> {
  return ASSISTANT_DEFINITIONS.reduce<Record<string, AssistantStatus>>((result, assistant) => {
    result[assistant.id] = "disabled";
    return result;
  }, {});
}

export function getAssistantSkillPaths(scope: Scope): string[] {
  return getUniquePaths(scope, getAssistantSkillPathsForScope);
}

export function getAssistantRulePaths(scope: Scope): string[] {
  return getUniquePaths(scope, getAssistantRulePathsForScope);
}

export function getAssistantSkillPathsForScope(assistant: AssistantDefinition, scope: Scope): string[] {
  return scope === "global" ? assistant.globalSkillPaths : assistant.projectSkillPaths;
}

export function getAssistantRulePathsForScope(assistant: AssistantDefinition, scope: Scope): string[] {
  return scope === "global" ? assistant.globalRulePaths : assistant.projectRulePaths;
}

function getUniquePaths(
  scope: Scope,
  pathSelector: (assistant: AssistantDefinition, scope: Scope) => string[]
): string[] {
  const uniquePaths = new Set<string>();

  for (const assistant of ASSISTANT_DEFINITIONS) {
    for (const path of pathSelector(assistant, scope)) {
      uniquePaths.add(path);
    }
  }

  return [...uniquePaths];
}
