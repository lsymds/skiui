import type { Argv } from "yargs";
import { createNotImplementedHandler } from "./not-implemented";

export function registerListCommand(cli: Argv) {
  return cli.command(
    "list",
    "List enabled repositories and skills",
    () => {},
    createNotImplementedHandler("list")
  );
}
