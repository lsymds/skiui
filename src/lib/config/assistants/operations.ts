import { ASSISTANT_DEFINITIONS } from "../../assistants/registry";
import type { ConfigScope } from "../../projects/types";
import { CliError } from "../../utils/errors";
import { loadConfigLayers } from "../layers";
import { writeConfigFile } from "../store";
import { type AssistantStatus, type SkiuiConfig } from "../types";
import { selectTargetLayer } from "../target-layer";

export type SetAssistantStatusOptions = {
  assistantId: string;
  status: AssistantStatus;
  scope?: ConfigScope;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type SetAssistantStatusResult = {
  scope: ConfigScope;
  configPath: string;
  assistantId: string;
  status: AssistantStatus;
  statusChanged: boolean;
};

const SUPPORTED_ASSISTANTS = new Set(ASSISTANT_DEFINITIONS.map((assistant) => assistant.id));

export async function enableAssistant(
  options: Omit<SetAssistantStatusOptions, "status">
): Promise<SetAssistantStatusResult> {
  return setAssistantStatus({
    ...options,
    status: "enabled"
  });
}

export async function disableAssistant(
  options: Omit<SetAssistantStatusOptions, "status">
): Promise<SetAssistantStatusResult> {
  return setAssistantStatus({
    ...options,
    status: "disabled"
  });
}

export async function setAssistantStatus(options: SetAssistantStatusOptions): Promise<SetAssistantStatusResult> {
  const layers = await loadConfigLayers(options.cwd, options.env);
  const target = selectTargetLayer(layers, options.scope);
  const assistantId = normalizeAssistantId(options.assistantId);

  if (!SUPPORTED_ASSISTANTS.has(assistantId)) {
    throw new CliError(`Assistant \`${assistantId}\` is not supported`);
  }

  const existingStatus = target.config.assistants[assistantId];
  const statusChanged = existingStatus !== options.status;

  if (statusChanged) {
    const updatedConfig: SkiuiConfig = {
      ...target.config,
      assistants: {
        ...target.config.assistants,
        [assistantId]: options.status
      }
    };

    await writeConfigFile(target.configPath, updatedConfig);
  }

  return {
    scope: target.scope,
    configPath: target.configPath,
    assistantId,
    status: options.status,
    statusChanged
  };
}

function normalizeAssistantId(assistantId: string): string {
  const normalized = assistantId.trim();

  if (normalized.length === 0) {
    throw new CliError("Assistant id is required");
  }

  return normalized;
}
