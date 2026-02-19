import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { ASSISTANT_DEFINITIONS, getAssistantRulePathsForScope } from "../assistants/registry";
import { DEFAULT_RULES_PATH, type SkiuiConfig } from "../config/types";
import { CliError } from "../utils/errors";
import { ensureDirectory, makeSymlink, pathExists } from "../utils/fs";

type ScopeName = "global" | "project";

export async function applyRulesForScope(options: {
  scope: ScopeName;
  config: SkiuiConfig;
  assistantRoot: string;
  contextRoot: string;
}): Promise<number> {
  const enabledAssistants = ASSISTANT_DEFINITIONS.filter(
    (assistant) => options.config.assistants[assistant.id] === "enabled"
  );

  const effectiveRulesPath = getEffectiveRulesPath(options.config.rulesPath);
  const rulesSourcePath = resolveScopedPath(effectiveRulesPath, options.contextRoot);

  if (options.scope === "project" && effectiveRulesPath === DEFAULT_RULES_PATH && !(await pathExists(rulesSourcePath))) {
    await ensureDirectory(dirname(rulesSourcePath));
    await writeFile(rulesSourcePath, "", "utf8");
  }

  if (!(await pathExists(rulesSourcePath))) {
    return 0;
  }

  let rulesLinked = 0;
  const linkedRuleDestinations = new Set<string>();

  for (const assistant of enabledAssistants) {
    for (const rulePath of getAssistantRulePathsForScope(assistant, options.scope)) {
      const destinationPath = isAbsolute(rulePath) ? rulePath : join(options.assistantRoot, rulePath);
      const destinationKey = resolve(destinationPath);

      if (linkedRuleDestinations.has(destinationKey)) {
        continue;
      }

      linkedRuleDestinations.add(destinationKey);
      assertLinkPathsDoNotOverlap({
        sourcePath: rulesSourcePath,
        destinationPath,
        context: `rules to assistant \`${assistant.id}\``
      });
      await makeSymlink(rulesSourcePath, destinationPath, { type: "file" });
      rulesLinked += 1;
    }
  }

  return rulesLinked;
}

function resolveScopedPath(path: string, contextRoot: string): string {
  return isAbsolute(path) ? path : resolve(contextRoot, path);
}

function getEffectiveRulesPath(rulesPath: string | undefined): string {
  const configuredPath = rulesPath?.trim();
  return configuredPath && configuredPath.length > 0 ? configuredPath : DEFAULT_RULES_PATH;
}

function assertLinkPathsDoNotOverlap(options: {
  sourcePath: string;
  destinationPath: string;
  context: string;
}): void {
  const source = resolve(options.sourcePath);
  const destination = resolve(options.destinationPath);

  if (source === destination || isDescendantPath(source, destination) || isDescendantPath(destination, source)) {
    throw new CliError(`Cannot link ${options.context} because source and destination paths overlap: ${source} <-> ${destination}`);
  }
}

function isDescendantPath(path: string, candidateAncestor: string): boolean {
  const relativePath = relative(candidateAncestor, path);
  return relativePath.length > 0 && !relativePath.startsWith("..") && relativePath !== ".";
}
