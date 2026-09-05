import { afterEach, describe, expect, test } from "bun:test";
import {
	loadAutopilotState,
	runAutopilotCycle,
	saveAutopilotState,
} from "./bridge.ts";
import { demoState } from "./model.ts";

afterEach(() => {
	(globalThis as { window?: unknown }).window = undefined;
});

describe("Autopilot bridge", () => {
	test("uses a preview node when the Companion host is absent", async () => {
		const loaded = await loadAutopilotState();

		expect(loaded.mode).toBe("demo");
		expect(loaded.state.companyName).toBe("Northstar Studio");
		expect(loaded.state.strategy.icp.audience).toContain(
			"Independent consultants"
		);
	});

	test("persists live state in the app namespace", async () => {
		const calls: unknown[] = [];
		(globalThis as { window?: unknown }).window = {
			ryu: {
				storage: {
					set: (input: unknown) => {
						calls.push(input);
						return Promise.resolve();
					},
				},
			},
		};

		await saveAutopilotState(demoState(), "live");

		expect(calls[0]).toMatchObject({ key: "state.v1", namespace: "autopilot" });
	});

	test("starts a live host with empty node-owned state, not demo data", async () => {
		(globalThis as { window?: unknown }).window = {
			ryu: {
				storage: {
					get: () => Promise.resolve(null),
				},
			},
		};

		const loaded = await loadAutopilotState();

		expect(loaded.mode).toBe("live");
		expect(loaded.state.active).toBe(true);
		expect(loaded.state.guardrails).toEqual({
			externalApproval: true,
			scopedWrites: true,
		});
		expect(loaded.state.strategy.productName).toBe("");
		expect(loaded.state.runs).toEqual([]);
	});

	test("does not synthesize a successful pass when the live runner is absent", async () => {
		(globalThis as { window?: unknown }).window = { ryu: {} };

		await expect(
			runAutopilotCycle(demoState().strategy, "", {
				externalApproval: true,
				scopedWrites: true,
			})
		).rejects.toThrow("strategy pass was not run");
	});

	test("runs one full tool-using cycle with the selected lane and guardrails", async () => {
		const calls: unknown[] = [];
		(globalThis as { window?: unknown }).window = {
			ryu: {
				agent: {
					run: (input: unknown) => {
						calls.push(input);
						return Promise.resolve("Validated the next product experiment.");
					},
				},
			},
		};

		const strategy = demoState().strategy;
		const report = await runAutopilotCycle(strategy, "agent-product", {
			externalApproval: true,
			scopedWrites: true,
		});

		expect(report).toBe("Validated the next product experiment.");
		expect(calls[0]).toMatchObject({
			agent_id: "agent-product",
			max_tokens: 1800,
			preset: "code_write",
			wall_time_secs: 180,
		});
		expect((calls[0] as { task: string }).task).toContain(
			"positioning-first launch strategist"
		);
		expect((calls[0] as { task: string }).task).toContain(
			"Track business expenses"
		);
		expect((calls[0] as { task: string }).task).toContain(
			"narrowly defined ICP"
		);
		expect((calls[0] as { task: string }).task).toContain(
			"external sends require approval=true"
		);
	});
});
