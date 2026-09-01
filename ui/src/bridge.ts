import type { RyuCatalogSnapshot } from "@ryu/app-host/app-bridge";
import { demoState, normalizeState, serializeState } from "./model.ts";
import type {
	AppMode,
	AutopilotState,
	LoadedAutopilot,
	StrategyDraft,
} from "./types.ts";

const STORAGE_NAMESPACE = "autopilot";
const STORAGE_KEY = "state.v1";
const LOCAL_STORAGE_KEY = "ryu.autopilot.state.v1";

interface RyuStorage {
	get(input: { key: string; namespace?: string }): Promise<string | null>;
	set(input: { key: string; namespace?: string; value: string }): Promise<void>;
}

interface RyuAgent {
	run(input: {
		agent_id?: string;
		max_tokens?: number;
		preset?: string;
		task: string;
		wall_time_secs?: number;
	}): Promise<unknown>;
}

interface RyuToast {
	show(input: {
		description?: string;
		title: string;
		variant?: "default" | "success" | "error" | "info";
	}): Promise<unknown>;
}

interface AutopilotBridge {
	agent?: RyuAgent;
	catalog?: { snapshot(): Promise<RyuCatalogSnapshot> };
	storage?: RyuStorage;
	ui?: { toast?: RyuToast };
}

declare global {
	interface Window {
		ryu?: AutopilotBridge;
	}
}

function bridge(): AutopilotBridge | null {
	return typeof window === "undefined" ? null : (window.ryu ?? null);
}

function localGet(): string | null {
	try {
		return globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
	} catch {
		return null;
	}
}

function localSet(value: string): void {
	try {
		globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, value);
	} catch {
		// The live host store remains authoritative when null-origin localStorage is unavailable.
	}
}

export async function loadAutopilotState(): Promise<LoadedAutopilot> {
	const current = bridge();
	if (!current) {
		const stored = localGet();
		return {
			catalog: null,
			mode: "demo",
			state: stored ? normalizeState(JSON.parse(stored)) : demoState(),
		};
	}
	let stored: string | null = null;
	if (current.storage) {
		stored = await current.storage.get({
			key: STORAGE_KEY,
			namespace: STORAGE_NAMESPACE,
		});
	}
	const [catalog] = await Promise.all([
		current.catalog?.snapshot().catch(() => null) ?? Promise.resolve(null),
	]);
	const state = stored ? normalizeState(JSON.parse(stored)) : demoState();
	const defaultAgentId =
		catalog?.agents.find(
			(agent) => agent.installed !== false && agent.enabled !== false
		)?.id ?? "";
	return {
		catalog,
		mode: "live",
		state:
			state.agentId || !defaultAgentId
				? state
				: { ...state, agentId: defaultAgentId },
	};
}

export async function saveAutopilotState(
	state: AutopilotState,
	mode: AppMode
): Promise<void> {
	const value = serializeState(state);
	localSet(value);
	if (mode !== "live") {
		return;
	}
	const current = bridge();
	if (!current?.storage) {
		throw new Error("Autopilot storage is not available on this host.");
	}
	await current.storage.set({
		key: STORAGE_KEY,
		namespace: STORAGE_NAMESPACE,
		value,
	});
}

function cycleTask(
	strategy: StrategyDraft,
	guardrails: AutopilotState["guardrails"]
): string {
	return [
		"You are Autopilot, a positioning-first launch strategist for a small product team.",
		"Run one bounded strategy pass. Start by deciding the one job this product should earn first. Do not expand the feature list. Then research the market position, alternatives, differentiation, value proposition, and a narrowly defined ICP. Only after those are explicit should you derive a proof test, outreach motion, and copy from the same decision.",
		"Inspect the enabled Ryu tools first and use only tools that can materially improve this strategy. Reuse existing Ryu apps and records instead of creating duplicate systems. Keep evidence for every completed action and return a concise report with: wedge, market read, ICP, activation, evidence, and next step. Treat all strategy outputs as hypotheses until a customer test supports them.",
		`Guardrails: external sends require approval=${guardrails.externalApproval}; writes stay scoped to enabled apps=${guardrails.scopedWrites}. Never claim an action happened unless the tool confirmed it.`,
		`Product: ${strategy.productName.trim()}`,
		`What it does today: ${strategy.productDescription.trim()}`,
		`Current one-job hypothesis: ${strategy.oneJob.trim()}`,
		`Current market position: ${strategy.marketStance.trim()}`,
		`Current ICP hypothesis: ${strategy.icp.audience.trim()}`,
	].join("\n\n");
}

export async function runAutopilotCycle(
	strategy: StrategyDraft,
	agentId: string,
	guardrails: AutopilotState["guardrails"]
): Promise<string> {
	const current = bridge();
	if (!current?.agent) {
		await new Promise((resolve) => globalThis.setTimeout(resolve, 700));
		return "Demo strategy pass completed. Test the one-job hypothesis with three independent consultants before expanding the product.";
	}
	const result = await current.agent.run({
		...(agentId.trim() ? { agent_id: agentId.trim() } : {}),
		max_tokens: 1800,
		preset: "code_write",
		task: cycleTask(strategy, guardrails),
		wall_time_secs: 180,
	});
	if (typeof result === "string") {
		return result;
	}
	return JSON.stringify(result);
}

export async function loadRuntimeCatalog(): Promise<RyuCatalogSnapshot | null> {
	const current = bridge();
	if (!current?.catalog) {
		return null;
	}
	try {
		return await current.catalog.snapshot();
	} catch {
		return null;
	}
}

export function notify(input: {
	description?: string;
	title: string;
	variant?: "default" | "success" | "error" | "info";
}): void {
	const show = bridge()?.ui?.toast?.show;
	if (!show) {
		return;
	}
	try {
		void show(input).catch(() => undefined);
	} catch {
		// The bridge can disappear synchronously while a Companion is closing.
	}
}
