import type { LoadedLayers } from "../config/layers"
import type { SkiuiConfig } from "../config/types"
import type { ConfigScope } from "../projects/types"

export type DoctorTaskContext = {
	scope: ConfigScope
	updatedConfig: SkiuiConfig
	layers: LoadedLayers
	cwd: string
	env: NodeJS.ProcessEnv
}

export type DoctorTask = {
	id: string
	shouldRun?: (context: DoctorTaskContext) => boolean
	run: (
		context: DoctorTaskContext,
	) => Promise<{ actions?: number | undefined } | undefined>
}

export type DoctorRunResult = {
	tasksRun: number
	tasksSkipped: number
	actions: number
	taskIds: string[]
}

export async function runDoctor(options: {
	context: DoctorTaskContext
	tasks: readonly DoctorTask[]
}): Promise<DoctorRunResult> {
	let tasksRun = 0
	let tasksSkipped = 0
	let actions = 0
	const taskIds: string[] = []

	for (const task of options.tasks) {
		if (task.shouldRun && !task.shouldRun(options.context)) {
			tasksSkipped += 1
			continue
		}

		const result = await task.run(options.context)
		tasksRun += 1
		taskIds.push(task.id)
		actions += result?.actions ?? 0
	}

	return {
		tasksRun,
		tasksSkipped,
		actions,
		taskIds,
	}
}
