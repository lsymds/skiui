import { CliError } from "./errors";

export function formatCliError(error: unknown): string {
  if (error instanceof CliError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
