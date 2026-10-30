import { formatTime } from "@ryu/ui/lib/timezone.ts";
import type {
	AutopilotLogEntry,
	AutopilotState,
	CycleRun,
	StrategyDraft,
} from "./types.ts";

export {
	DEFAULT_BRIEF,
	demoState,
	emptyState,
	STAGES,
} from "./model-defaults.ts";
export { normalizeState } from "./model-normalize.ts";

export function serializeState(state: AutopilotState): string {
	return JSON.stringify(state);
}

export function patchState(
	state: AutopilotState,
	patch: Partial<
		Pick<AutopilotState, "active" | "agentId" | "companyName" | "guardrails">
	>
): AutopilotState {
	return { ...state, ...patch, lastUpdatedAt: new Date().toISOString() };
}

export function patchStrategy(
	state: AutopilotState,
	patch: Partial<StrategyDraft>
): AutopilotState {
	const changed = Object.keys(patch).length > 0;
	const strategy: StrategyDraft = {
		...state.strategy,
		...patch,
		activation: changed
			? {
					...state.strategy.activation,
					...patch.activation,
					prepared: false,
				}
			: state.strategy.activation,
		icp: patch.icp
			? { ...state.strategy.icp, ...patch.icp }
			: state.strategy.icp,
		status: changed ? "draft" : state.strategy.status,
	};
	return {
		...state,
		brief: strategy.productDescription,
		lastUpdatedAt: new Date().toISOString(),
		strategy,
	};
}

interface StartCycleResult {
	run: CycleRun;
	state: AutopilotState;
}

export function startCycle(
	state: AutopilotState,
	brief = state.strategy.productDescription
): StartCycleResult {
	const now = new Date().toISOString();
	const focus =
		brief.trim() === state.strategy.productDescription.trim()
			? state.strategy.productName
			: brief.trim();
	const run: CycleRun = {
		id: `strategy-${Date.now()}`,
		startedAt: now,
		status: "running",
		summary: "Reviewing the wedge before activation",
		title: `Strategy pass · ${focus || "Untitled product"}`,
	};
	const log: AutopilotLogEntry = {
		createdAt: now,
		detail:
			"Autopilot will settle the one job before deriving the market position, ICP, outreach, or copy.",
		id: `${run.id}-log`,
		runId: run.id,
		stage: "wedge",
		status: "working",
		title: "Started a positioning-first pass",
	};
	return {
		run,
		state: {
			...state,
			lastUpdatedAt: now,
			log: [log, ...state.log].slice(0, 100),
			runs: [run, ...state.runs].slice(0, 50),
		},
	};
}

function reportSummary(report: string): string {
	const line = report
		.split(/\n+/)
		.map((item) => item.replace(/^[-*#\s]+/, "").trim())
		.find(Boolean);
	return (
		line || "The strategy pass completed with no summary from the agent."
	).slice(0, 160);
}

export function finishCycle(
	state: AutopilotState,
	runId: string,
	report: string
): AutopilotState {
	const now = new Date().toISOString();
	const summary = reportSummary(report);
	const nextStages = state.stages.map((stage) => {
		if (stage.id === "positioning") {
			return {
				...stage,
				createdAt: now,
				progress: Math.min(100, stage.progress + 8),
			};
		}
		if (stage.id === "icp") {
			return {
				...stage,
				createdAt: now,
				progress: Math.min(100, stage.progress + 5),
			};
		}
		return stage;
	});
	return {
		...state,
		lastUpdatedAt: now,
		log: state.log.map((item) =>
			item.runId === runId
				? {
						...item,
						createdAt: now,
						detail: summary,
						stage: "positioning",
						status: "done",
						title: "Strategy pass completed",
					}
				: item
		),
		runs: state.runs.map((run) =>
			run.id === runId
				? { ...run, completedAt: now, status: "completed", summary }
				: run
		),
		stages: nextStages,
		strategy: {
			...state.strategy,
			activation: { ...state.strategy.activation, prepared: false },
			status: "ready",
		},
	};
}

export function failCycle(
	state: AutopilotState,
	runId: string,
	error: string
): AutopilotState {
	const now = new Date().toISOString();
	return {
		...state,
		lastUpdatedAt: now,
		log: state.log.map((item) =>
			item.runId === runId
				? {
						...item,
						createdAt: now,
						detail: error,
						status: "waiting",
						title: "Strategy pass needs attention",
					}
				: item
		),
		runs: state.runs.map((run) =>
			run.id === runId
				? {
						...run,
						completedAt: now,
						status: "failed",
						summary: error.slice(0, 160),
					}
				: run
		),
	};
}

export function prepareActivation(state: AutopilotState): AutopilotState {
	const now = new Date().toISOString();
	const entry: AutopilotLogEntry = {
		createdAt: now,
		detail:
			"Outreach and copy inherit the selected job and ICP. External sends still wait for approval.",
		id: `activation-${Date.now()}`,
		stage: "activation",
		status: "done",
		title: "Activation pack prepared",
	};
	return {
		...state,
		lastUpdatedAt: now,
		log: [entry, ...state.log].slice(0, 100),
		strategy: {
			...state.strategy,
			activation: { ...state.strategy.activation, prepared: true },
		},
	};
}

export function markStrategySaved(state: AutopilotState): AutopilotState {
	const now = new Date().toISOString();
	const entry: AutopilotLogEntry = {
		createdAt: now,
		detail:
			"The saved draft is the source for the next strategy pass and activation pack.",
		id: `strategy-save-${Date.now()}`,
		stage: "wedge",
		status: "done",
		title: "Strategy draft saved",
	};
	return {
		...state,
		lastUpdatedAt: now,
		log: [entry, ...state.log].slice(0, 100),
	};
}

export function timeAgo(value: string): string {
	const timestamp = new Date(value).getTime();
	if (!Number.isFinite(timestamp)) {
		return "Recently";
	}
	const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
	if (seconds < 60) {
		return `${seconds}s ago`;
	}
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m ago`;
	}
	const hours = Math.round(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}
	return `${Math.round(hours / 24)}d ago`;
}

export function formatClock(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Recently"
		: formatTime(date, { hour: "numeric", minute: "2-digit" });
}
