import { describe, expect, test } from "bun:test";

import {
	demoState,
	failCycle,
	finishCycle,
	markStrategySaved,
	normalizeState,
	patchStrategy,
	prepareActivation,
	serializeState,
	startCycle,
} from "./model.ts";

describe("Autopilot state model", () => {
	test("starts with a positioning-first launch strategy", () => {
		const state = demoState();

		expect(state.strategy.oneJob).toContain("Track business expenses");
		expect(state.strategy.marketStance).toContain("focused specialist");
		expect(state.strategy.icp.audience).toContain("Independent consultants");
		expect(state.strategy.activation.headline).toContain("business expenses");
		expect(state.stages.map(({ id }) => id)).toEqual([
			"wedge",
			"positioning",
			"icp",
			"activation",
		]);
	});

	test("migrates malformed and legacy state to bounded defaults", () => {
		const state = normalizeState({
			active: "yes",
			brief: "  A useful product description  ",
			guardrails: { externalApproval: false },
			log: Array.from({ length: 120 }, (_, index) => ({
				detail: `detail-${index}`,
				id: `log-${index}`,
				stage: "build",
				status: "working",
				title: `Log ${index}`,
			})),
			stages: [{ id: "build", progress: 150 }],
		});

		expect(state.active).toBe(true);
		expect(state.brief).toBe("A useful product description");
		expect(state.strategy.productDescription).toBe(
			"A useful product description"
		);
		expect(state.strategy.status).toBe("ready");
		expect(state.guardrails).toEqual({
			externalApproval: false,
			scopedWrites: true,
		});
		expect(state.log).toHaveLength(100);
		expect(state.log[0]?.stage).toBe("positioning");
		expect(state.stages.map(({ id }) => id)).toEqual([
			"wedge",
			"positioning",
			"icp",
			"activation",
		]);
	});

	test("updates a strategy draft without losing nested ICP or activation data", () => {
		const initial = demoState();
		const updated = patchStrategy(initial, {
			icp: { ...initial.strategy.icp, audience: "Design partners" },
			oneJob: "Close the weekly books",
		});

		expect(updated.strategy.oneJob).toBe("Close the weekly books");
		expect(updated.strategy.icp.audience).toBe("Design partners");
		expect(updated.strategy.status).toBe("draft");
		expect(updated.strategy.activation.prepared).toBe(false);
		expect(updated.strategy.activation.headline).toBe(
			initial.strategy.activation.headline
		);
		expect(updated.brief).toBe(initial.brief);
	});

	test("starts a strategy pass with a running record and working log", () => {
		const initial = demoState();
		const { run, state } = startCycle(initial, "Improve onboarding");

		expect(run.status).toBe("running");
		expect(run.title).toContain("Improve onboarding");
		expect(state.runs[0]).toEqual(run);
		expect(state.log[0]).toMatchObject({
			runId: run.id,
			stage: "wedge",
			status: "working",
		});
	});

	test("finishes the active strategy pass and advances position and ICP", () => {
		const { run, state } = startCycle(demoState(), "Improve onboarding");
		const finished = finishCycle(
			state,
			run.id,
			"Validated a smaller positioning test."
		);

		expect(finished.runs[0]).toMatchObject({
			id: run.id,
			status: "completed",
			summary: "Validated a smaller positioning test.",
		});
		expect(finished.log[0]).toMatchObject({
			runId: run.id,
			stage: "positioning",
			status: "done",
			title: "Strategy pass completed",
		});
		expect(
			finished.stages.find((stage) => stage.id === "positioning")?.progress
		).toBe(94);
		expect(finished.stages.find((stage) => stage.id === "icp")?.progress).toBe(
			83
		);
	});

	test("prepares activation without sending anything externally", () => {
		const prepared = prepareActivation(demoState());

		expect(prepared.strategy.activation.prepared).toBe(true);
		expect(prepared.log[0]).toMatchObject({
			stage: "activation",
			status: "done",
			title: "Activation pack prepared",
		});
	});

	test("saves a strategy draft as an observable local decision", () => {
		const saved = markStrategySaved(demoState());

		expect(saved.log[0]).toMatchObject({
			stage: "wedge",
			status: "done",
			title: "Strategy draft saved",
		});
	});

	test("fails a strategy pass without turning it into a completed run", () => {
		const { run, state } = startCycle(demoState(), "Improve onboarding");
		const failed = failCycle(
			state,
			run.id,
			"Approval is required before sending."
		);

		expect(failed.runs[0]).toMatchObject({
			id: run.id,
			status: "failed",
			summary: "Approval is required before sending.",
		});
		expect(failed.log[0]).toMatchObject({
			runId: run.id,
			status: "waiting",
			title: "Strategy pass needs attention",
		});
	});

	test("serializes state without changing its wire shape", () => {
		const state = demoState();
		const parsed = JSON.parse(serializeState(state)) as typeof state;

		expect(parsed).toEqual(state);
	});
});
