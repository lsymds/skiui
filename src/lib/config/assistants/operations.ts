import { ASSISTANT_DEFINITIONS } from "../../assistants/registry";
import type { ConfigScope } from "../../projects/types";
import { CliError } from "../../utils/errors";
import { type LoadedLayers, loadConfigLayers } from "../layers";
import { writeConfigFile } from "../store";
import { CONFIG_VERSION, type AssistantStatus, type SkiuiConfig } from "../types";

type TargetLayer = {
  scope: ConfigScope;
  configPath: string;
  config: SkiuiConfig;
};

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

function selectTargetLayer(layers: LoadedLayers, scope: ConfigScope | undefined): TargetLayer {
  if (scope === "global") {
    if (!layers.global.config) {
      throw new CliError("No global skiui configuration found. Run `skiui init --global` first.");
    }

    return {
      scope: "global",
      configPath: layers.global.configPath,
      config: layers.global.config
    };
  }

  if (scope === "project") {
    if (!layers.project.config) {
      throw new CliError("No project skiui configuration found. Run `skiui init` first.");
    }

    return {
      scope: "project",
      configPath: layers.project.configPath,
      config: layers.project.config
    };
  }

  if (scope === "local") {
    if (!layers.project.config) {
      throw new CliError("No project skiui configuration found. Run `skiui init` first.");
    }

    return {
      scope: "local",
      configPath: layers.local.configPath,
      config: layers.local.config ?? createDefaultLocalConfig(layers.project.config)
    };
  }

  if (layers.project.config) {
    return {
      scope: "project",
      configPath: layers.project.configPath,
      config: layers.project.config
    };
  }

  if (layers.global.config) {
    return {
      scope: "global",
      configPath: layers.global.configPath,
      config: layers.global.config
    };
  }

  throw new CliError("No skiui configuration found. Run `skiui init` first.");
}

function normalizeAssistantId(assistantId: string): string {
  const normalized = assistantId.trim();

  if (normalized.length === 0) {
    throw new CliError("Assistant id is required");
  }

  return normalized;
}

function createDefaultLocalConfig(projectConfig: SkiuiConfig): SkiuiConfig {
  return {
    version: CONFIG_VERSION,
    cachePath: projectConfig.cachePath,
    assistants: {},
    repositories: []
  };
}
