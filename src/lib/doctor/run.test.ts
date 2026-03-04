import { expect, test } from "bun:test"
import type { LoadedLayers } from "../config/layers"
import type { SkiuiConfig } from "../config/types"
import { type DoctorTask, runDoctor } from "./run"

function createStubContext() {
	const config: SkiuiConfig = {
		version: 1,
		cachePath: ".skiui/repos",
		assistants: {},
		repositories: [],
	}

	const layers = {
		global: {
			scope: "global",
			config,
			configPath: "/tmp/global/skiui.json",
		},
		project: {
			scope: "project",
			config,
			configPath: "/tmp/project/.skiui/skiui.json",
		},
		local: {
			scope: "local",
			config,
			configPath: "/tmp/project/.skiui/skiui.local.json",
		},
	} satisfies LoadedLayers

	return {
		scope: "project" as const,
		updatedConfig: config,
		layers,
		cwd: "/tmp/project",
		env: { HOME: "/tmp/home" },
	}
}

test("runDoctor executes tasks in order and aggregates actions", async () => {
	const order: string[] = []

	const tasks: DoctorTask[] = [
		{
			id: "first",
			run: async () => {
				order.push("first")
				return { actions: 2 }
			},
		},
		{
			id: "second",
			run: async () => {
				order.push("second")
				return { actions: 3 }
			},
		},
	]

	const result = await runDoctor({ context: createStubContext(), tasks })

	expect(order).toEqual(["first", "second"])
	expect(result.tasksRun).toBe(2)
	expect(result.tasksSkipped).toBe(0)
	expect(result.actions).toBe(5)
	expect(result.taskIds).toEqual(["first", "second"])
})

test("runDoctor skips tasks when shouldRun returns false", async () => {
	const order: string[] = []

	const tasks: DoctorTask[] = [
		{
			id: "skip-me",
			shouldRun: () => false,
			run: async () => {
				order.push("skip-me")
				return undefined
			},
		},
		{
			id: "run-me",
			run: async () => {
				order.push("run-me")
				return undefined
			},
		},
	]

	const result = await runDoctor({ context: createStubContext(), tasks })

	expect(order).toEqual(["run-me"])
	expect(result.tasksRun).toBe(1)
	expect(result.tasksSkipped).toBe(1)
	expect(result.actions).toBe(0)
	expect(result.taskIds).toEqual(["run-me"])
})
