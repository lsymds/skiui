export class CliError extends Error {
	readonly exitCode: number

	constructor(message: string, exitCode = 1) {
		super(message)
		this.name = "CliError"
		this.exitCode = exitCode
	}
}

export class NotImplementedError extends CliError {
	constructor(commandName: string) {
		super(`Command \`${commandName}\` is not implemented yet`, 1)
		this.name = "NotImplementedError"
	}
}
