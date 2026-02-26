import type { ArgumentsCamelCase } from "yargs"
import { NotImplementedError } from "../../../lib/utils/errors"

type UnknownArgs = ArgumentsCamelCase<Record<string, unknown>>

export function createNotImplementedHandler(commandName: string) {
	return async (_args: UnknownArgs) => {
		throw new NotImplementedError(commandName)
	}
}
