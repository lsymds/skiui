#!/usr/bin/env bun

import { formatCliError } from "../../lib/utils/output";
import { CliError } from "../../lib/utils/errors";
import { buildCli } from "./program";

const cli = buildCli();

void cli.parseAsync().catch((error: unknown) => {
  console.error(formatCliError(error));
  if (error instanceof CliError) {
    process.exit(error.exitCode);
  }

  process.exit(1);
});
