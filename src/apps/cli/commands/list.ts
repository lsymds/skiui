import type { Argv } from "yargs";
import { listEnabledSkills, type EnabledSkillListEntry } from "../../../lib/config/skills/index";

export function registerListCommand(cli: Argv) {
  return cli.command(
    "list",
    "List enabled repositories and skills",
    () => {},
    async () => {
      const result = await listEnabledSkills();

      if (result.entries.length === 0) {
        console.log("No enabled repositories or skills found");
        return;
      }

      console.log(formatList(result.entries));
    }
  );
}

function formatList(entries: EnabledSkillListEntry[]): string {
  const lines: string[] = [];

  for (const scope of ["global", "project", "local"] as const) {
    const scopedEntries = entries.filter((entry) => entry.scope === scope);
    if (scopedEntries.length === 0) {
      continue;
    }

    lines.push(`${scope}:`);

    const repositoryKeys = [...new Set(scopedEntries.map((entry) => `${entry.repositoryName}|${entry.sourceType}`))];

    for (const repositoryKey of repositoryKeys) {
      const [repositoryName, sourceType] = repositoryKey.split("|");
      const repositoryEntries = scopedEntries.filter(
        (entry) => entry.repositoryName === repositoryName && entry.sourceType === sourceType
      );

      lines.push(`  ${repositoryName} (${sourceType})`);

      for (const entry of repositoryEntries) {
        const skillLabel = entry.skillPath === entry.skillName ? entry.skillName : `${entry.skillName} (${entry.skillPath})`;
        lines.push(`    - ${skillLabel}`);
      }
    }
  }

  return lines.join("\n");
}
