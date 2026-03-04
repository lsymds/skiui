import type { DoctorRunResult, DoctorTaskContext } from "./run"
import { runDoctor } from "./run"
import { PRUNE_MANAGED_SYMLINKS_TASK } from "./scope-symlinks"

export const DEFAULT_DOCTOR_TASKS = [PRUNE_MANAGED_SYMLINKS_TASK] as const

export async function runDefaultDoctor(
	context: DoctorTaskContext,
): Promise<DoctorRunResult> {
	return runDoctor({
		context,
		tasks: DEFAULT_DOCTOR_TASKS,
	})
}
