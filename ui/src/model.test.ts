import { describe, expect, test } from "bun:test";

import {
	demoState,
	emptyState,
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

	test("uses an empty fallback for partial node-owned state", () => {
		const state = normalizeState(
			{
				brief: "Ship the onboarding proof",
				companyName: "Acme Labs",
				log: [
					{
						createdAt: "2026-09-17T00:00:00.000Z",
						detail: "A user-owned activity",
						id: "custom-log",
						stage: "wedge",
						status: "waiting",
						title: "Custom activity",
					},
				],
				runs: [
					{
						id: "custom-run",
						startedAt: "2026-09-17T00:00:00.000Z",
						status: "running",
						summary: "Waiting for the next step",
						title: "Custom run",
					},
				],
				stages: [
					{
						action: "Confirm the proof",
						createdAt: "2026-09-17T00:00:00.000Z",
						id: "wedge",
						progress: 42,
					},
				],
			},
			emptyState()
		);

		expect(state.brief).toBe("Ship the onboarding proof");
		expect(state.companyName).toBe("Acme Labs");
		expect(state.strategy.productName).toBe("");
		expect(state.log).toMatchObject([
			{ detail: "A user-owned activity", title: "Custom activity" },
		]);
		expect(state.runs).toMatchObject([
			{ status: "running", summary: "Waiting for the next step" },
		]);
		expect(state.stages.find((stage) => stage.id === "wedge")).toMatchObject({
			action: "Confirm the proof",
			progress: 42,
		});
		expect(
			state.stages.find((stage) => stage.id === "positioning")
		).toMatchObject({
			action: "Not started",
			progress: 0,
		});
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
		const parsed = JSON.parse(serializeState(state));

		expect(parsed).toEqual(state);
	});
	test("keeps valid false, zero, and empty fields during legacy migration", () => {
		const fallback = demoState();
		const state = normalizeState(
			{
				active: false,
				brief: "",
				guardrails: { externalApproval: false, scopedWrites: false },
				log: [
					null,
					{ id: "", detail: "", title: "", stage: "reach", status: "waiting" },
				],
				runs: [null, { id: "", summary: "", title: "", status: "failed" }],
				stages: [
					{ id: "build", progress: 0, action: "" },
					{ id: "positioning", progress: 99 },
				],
			},
			fallback
		);
		expect(state.active).toBe(false);
		expect(state.guardrails).toEqual({
			externalApproval: false,
			scopedWrites: false,
		});
		expect(
			state.stages.find((stage) => stage.id === "positioning")
		).toMatchObject({ progress: 0, action: "" });
		expect(state.log).toHaveLength(1);
		expect(state.log[0]).toMatchObject({
			id: "",
			detail: "",
			title: "",
			stage: "activation",
			status: "waiting",
		});
		expect(state.runs).toHaveLength(1);
		expect(state.runs[0]).toMatchObject({
			id: "",
			summary: "",
			title: "",
			status: "failed",
		});
	});
	test("retains sparse nested fallbacks for invalid persisted fields", () => {
		const fallback = emptyState();
		const state = normalizeState(
			{
				guardrails: "invalid",
				strategy: {
					icp: ["invalid"],
					activation: 42,
					productName: 123,
					productDescription: "  ",
					status: "future",
				},
				stages: [
					{ id: 42, progress: 80 },
					{ id: "icp", progress: null },
				],
				log: "invalid",
				runs: {},
			},
			fallback
		);
		expect(state.guardrails).toEqual(fallback.guardrails);
		expect(state.strategy.icp).toEqual(fallback.strategy.icp);
		expect(state.strategy.activation).toEqual(fallback.strategy.activation);
		expect(state.strategy.productName).toBe(fallback.strategy.productName);
		expect(state.strategy.productDescription).toBe(
			fallback.strategy.productDescription
		);
		expect(state.strategy.status).toBe("draft");
		expect(state.stages.find((stage) => stage.id === "icp")?.progress).toBe(0);
		expect(state.log).toEqual([]);
		expect(state.runs).toEqual([]);
	});
	test("keeps the selected fallback when no stored input exists", () => {
		const fallback = emptyState();
		expect(normalizeState(undefined, fallback)).toBe(fallback);
		expect(normalizeState(null, fallback)).toBe(fallback);
		expect(normalizeState([], fallback)).toBe(fallback);
	});
});
