import type { Argv } from "yargs";
import { createNotImplementedHandler } from "./not-implemented";

export function registerApplyCommand(cli: Argv) {
  return cli.command(
    "apply",
    "Fetch repositories and apply skills to assistants",
    () => {},
    createNotImplementedHandler("apply")
  );
}
