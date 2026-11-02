import { afterEach, describe, expect, test } from "bun:test";
import type { AutopilotBridge } from "./bridge.ts";
import {
	loadAutopilotState,
	runAutopilotCycle,
	saveAutopilotState,
} from "./bridge.ts";
import { demoState, serializeState } from "./model.ts";

type AgentRunInput = Parameters<
	NonNullable<AutopilotBridge["agent"]>["run"]
>[0];
type StorageSetInput = Parameters<
	NonNullable<AutopilotBridge["storage"]>["set"]
>[0];
type FixtureBridge = Omit<AutopilotBridge, "storage"> & {
	storage?: Partial<NonNullable<AutopilotBridge["storage"]>>;
};
function installWindow(value: { ryu?: FixtureBridge } | undefined): void {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		writable: true,
		value,
	});
}

afterEach(() => {
	installWindow(undefined);
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

	test("recovers from malformed preview storage without leaving preview mode", async () => {
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: () => "not-json",
				setItem: () => undefined,
				removeItem: () => undefined,
				clear: () => undefined,
				key: () => null,
				length: 0,
			},
			writable: true,
		});

		const loaded = await loadAutopilotState();

		expect(loaded.mode).toBe("demo");
		expect(loaded.state.companyName).toBe("Northstar Studio");
	});

	test("persists live state in the app namespace", async () => {
		const calls: StorageSetInput[] = [];
		installWindow({
			ryu: {
				storage: {
					set: (input: StorageSetInput) => {
						calls.push(input);
						return Promise.resolve();
					},
				},
			},
		});

		await saveAutopilotState(demoState(), "live");

		expect(calls[0]).toMatchObject({ key: "state.v1", namespace: "autopilot" });
	});

	test("starts a live host with empty node-owned state, not demo data", async () => {
		installWindow({
			ryu: {
				storage: {
					get: () => Promise.resolve(null),
				},
			},
		});

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

	test("does not turn malformed live JSON into the demo workspace", async () => {
		for (const stored of ["null", "{}"]) {
			installWindow({
				ryu: {
					storage: {
						get: () => Promise.resolve(stored),
					},
				},
			});

			const loaded = await loadAutopilotState();

			expect(loaded.mode).toBe("live");
			expect(loaded.state.strategy.productName).toBe("");
			expect(loaded.state.runs).toEqual([]);
		}
	});

	test("keeps legacy user values with an empty live fallback", async () => {
		installWindow({
			ryu: {
				storage: {
					get: () =>
						Promise.resolve(
							JSON.stringify({
								brief: "Ship the onboarding proof",
								companyName: "Acme Labs",
							})
						),
				},
			},
		});

		const loaded = await loadAutopilotState();

		expect(loaded.mode).toBe("live");
		expect(loaded.state.brief).toBe("Ship the onboarding proof");
		expect(loaded.state.companyName).toBe("Acme Labs");
		expect(loaded.state.strategy.productDescription).toBe(
			"Ship the onboarding proof"
		);
		expect(loaded.state.strategy.productName).toBe("");
		expect(loaded.state.log).toEqual([]);
		expect(loaded.state.runs).toEqual([]);
	});

	test("loads a complete current state from live storage", async () => {
		const state = demoState();
		installWindow({
			ryu: {
				storage: {
					get: () => Promise.resolve(JSON.stringify(state)),
				},
			},
		});

		const loaded = await loadAutopilotState();

		expect(loaded.mode).toBe("live");
		expect(loaded.state.strategy.productName).toBe("Expense Tracker");
		expect(loaded.state.runs[0]?.status).toBe("completed");
	});

	test("does not synthesize a successful pass when the live runner is absent", async () => {
		installWindow({ ryu: {} });

		await expect(
			runAutopilotCycle(demoState().strategy, "", {
				externalApproval: true,
				scopedWrites: true,
			})
		).rejects.toThrow("strategy pass was not run");
	});

	test("runs one full tool-using cycle with the selected lane and guardrails", async () => {
		const calls: AgentRunInput[] = [];
		installWindow({
			ryu: {
				agent: {
					run: (input: AgentRunInput) => {
						calls.push(input);
						return Promise.resolve("Validated the next product experiment.");
					},
				},
			},
		});

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
		expect(calls[0]?.task).toContain("positioning-first launch strategist");
		expect(calls[0]?.task).toContain("Track business expenses");
		expect(calls[0]?.task).toContain("narrowly defined ICP");
		expect(calls[0]?.task).toContain("external sends require approval=true");
	});

	test("surfaces a refused live save and an exact retry persists only the requested state", async () => {
		const writes: string[] = [];
		let attempts = 0;
		let stored: string | null = null;
		installWindow({
			ryu: {
				storage: {
					get: () => Promise.resolve(stored),
					set: (input: { value: string }) => {
						attempts += 1;
						writes.push(input.value);
						if (attempts === 1) {
							return Promise.reject(new Error("storage permission denied"));
						}
						stored = input.value;
						return Promise.resolve();
					},
				},
			},
		});
		const requested = demoState();

		await expect(saveAutopilotState(requested, "live")).rejects.toThrow(
			"storage permission denied"
		);
		expect(stored).toBeNull();
		await saveAutopilotState(requested, "live");

		expect(attempts).toBe(2);
		expect(writes).toEqual([
			serializeState(requested),
			serializeState(requested),
		]);
		const loaded = await loadAutopilotState();
		expect(loaded.mode).toBe("live");
		expect(loaded.state).toEqual(requested);
	});

	test("keeps concurrent strategy passes isolated by selected agent", async () => {
		const pending = new Map<string, (value: string) => void>();
		installWindow({
			ryu: {
				agent: {
					run: (input: { agent_id?: string }) =>
						new Promise<string>((resolve) => {
							pending.set(input.agent_id ?? "", resolve);
						}),
				},
			},
		});
		const strategy = demoState().strategy;
		const guardrails = { externalApproval: true, scopedWrites: true };
		const first = runAutopilotCycle(strategy, "agent-first", guardrails);
		const second = runAutopilotCycle(strategy, "agent-second", guardrails);

		expect([...pending.keys()]).toEqual(["agent-first", "agent-second"]);
		pending.get("agent-second")?.("second result");
		pending.get("agent-first")?.("first result");

		expect(await second).toBe("second result");
		expect(await first).toBe("first result");
	});
});
