import type { Argv } from "yargs";
import { applyConfiguredSkills } from "../../../lib/repos/apply";
import { CliError } from "../../../lib/utils/errors";

export function registerApplyCommand(cli: Argv) {
  return cli.command(
    "apply",
    "Fetch repositories and apply skills and rules to assistants",
    () => {},
    async () => {
      const result = await applyConfiguredSkills();

      for (const scope of result.scopes) {
        console.log(
          `Applied ${scope.scope} scope: synced ${scope.repositoriesSynced} repositories, linked ${scope.skillsLinked} skills, linked ${scope.rulesLinked} rules`
        );
      }

      if (result.missingSkills.length > 0) {
        const details = result.missingSkills
          .map((missingSkill) => `${missingSkill.scope} ${missingSkill.repositoryName}/${missingSkill.skillPath}`)
          .join(", ");
        throw new CliError(`Enabled skills were not found in repository sources: ${details}`);
      }
    }
  );
}
