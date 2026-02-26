#!/usr/bin/env bun

import { CliError } from "../../lib/utils/errors"
import { formatCliError } from "../../lib/utils/output"
import { buildCli } from "./program"

const cli = buildCli()

void cli.parseAsync().catch((error: unknown) => {
	console.error(formatCliError(error))
	if (error instanceof CliError) {
		process.exit(error.exitCode)
	}

	process.exit(1)
})
