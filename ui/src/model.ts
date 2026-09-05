import type {
	ActivationPlan,
	AutopilotLogEntry,
	AutopilotState,
	CycleRun,
	Guardrails,
	IcpProfile,
	StageId,
	StageSnapshot,
	StrategyDraft,
} from "./types.ts";

export const DEFAULT_BRIEF =
	"Capture receipts and bank exports, categorize business spend, and keep a tax-ready weekly view.";

export const STAGES: Array<{
	detail: string;
	id: StageId;
	label: string;
}> = [
	{
		detail: "Choose the one job worth earning first.",
		id: "wedge",
		label: "One job",
	},
	{
		detail: "Name the market position and reason to choose.",
		id: "positioning",
		label: "Position",
	},
	{
		detail: "Narrow the first audience and buying trigger.",
		id: "icp",
		label: "ICP",
	},
	{
		detail: "Derive outreach and copy from the same decision.",
		id: "activation",
		label: "Activate",
	},
];

function nowIso(offsetMs = 0): string {
	return new Date(Date.now() - offsetMs).toISOString();
}

function defaultStrategy(): StrategyDraft {
	return {
		activation: {
			cta: "See the weekly close",
			headline: "Close your business expenses in five minutes a week.",
			outreach:
				"Ask 10 independent consultants how they close the last 30 days of business spend; invite 3 to a one-week test.",
			prepared: false,
			subhead:
				"A focused expense tracker for independent consultants who want tax-ready spend without spreadsheet cleanup.",
		},
		category: "Focused expense control for independent consultants",
		differentiation:
			"Turns messy business spend into a weekly, tax-ready decision without asking a solo consultant to become an accountant.",
		icp: {
			audience:
				"Independent consultants with recurring business spend and no dedicated finance team.",
			buyer: "The solo consultant or owner-operator",
			exclude:
				"Household finance users and teams already served by a finance department.",
			trigger:
				"Quarter-end or tax prep exposes a backlog of uncategorized transactions.",
		},
		jobBoundary:
			"Ignore reporting, reminders, and integrations until weekly expense capture earns repeat use.",
		marketAlternatives:
			"Spreadsheets, bank exports, and generic personal finance apps",
		marketOpening:
			"The weekly close between capturing spend and handing it to a tax preparer.",
		marketStance: "A focused specialist, not an all-in-one finance suite",
		oneJob:
			"Track business expenses and close the week without spreadsheet cleanup.",
		positioningStatement:
			"For independent consultants who lose time sorting business spend, Expense Tracker is the weekly expense control tool that turns receipts and bank exports into a tax-ready view. Unlike generic finance apps or spreadsheets, it is built around the consultant's weekly close.",
		productDescription: DEFAULT_BRIEF,
		productName: "Expense Tracker",
		proofTest:
			"Three consultants categorize 90% of new business spend in under five minutes for two consecutive weeks.",
		status: "ready",
		valueProp:
			"Know what you spent, where it belongs, and what to save for tax in five minutes a week.",
	};
}

function blankStrategy(): StrategyDraft {
	return {
		activation: {
			cta: "",
			headline: "",
			outreach: "",
			prepared: false,
			subhead: "",
		},
		category: "",
		differentiation: "",
		icp: { audience: "", buyer: "", exclude: "", trigger: "" },
		jobBoundary: "",
		marketAlternatives: "",
		marketOpening: "",
		marketStance: "",
		oneJob: "",
		positioningStatement: "",
		productDescription: "",
		productName: "",
		proofTest: "",
		status: "draft",
		valueProp: "",
	};
}

function logEntry(
	id: string,
	stage: StageId,
	title: string,
	detail: string,
	offsetMs: number
): AutopilotLogEntry {
	return {
		createdAt: nowIso(offsetMs),
		detail,
		id,
		stage,
		status: "done",
		title,
	};
}

function stageSnapshot(
	id: StageId,
	progress: number,
	action: string,
	offsetMs: number
): StageSnapshot {
	return { action, createdAt: nowIso(offsetMs), id, progress };
}

export function demoState(): AutopilotState {
	return {
		agentId: "",
		active: true,
		brief: DEFAULT_BRIEF,
		companyName: "Northstar Studio",
		createdAt: nowIso(1000 * 60 * 60 * 12),
		guardrails: { externalApproval: true, scopedWrites: true },
		lastUpdatedAt: nowIso(1000 * 60 * 2),
		log: [
			logEntry(
				"log-wedge",
				"wedge",
				"Chose one job",
				"Track business expenses without weekly spreadsheet cleanup.",
				1000 * 60 * 2
			),
			logEntry(
				"log-positioning",
				"positioning",
				"Placed the product in the market",
				"A focused specialist between raw capture and tax preparation.",
				1000 * 60 * 7
			),
			logEntry(
				"log-icp",
				"icp",
				"Narrowed the first ICP",
				"Independent consultants with recurring business spend and no finance team.",
				1000 * 60 * 12
			),
			logEntry(
				"log-activation",
				"activation",
				"Outlined the first proof test",
				"Interview first; outreach and copy follow the same job and audience.",
				1000 * 60 * 18
			),
		],
		runs: [
			{
				completedAt: nowIso(1000 * 60 * 60),
				id: "strategy-1",
				startedAt: nowIso(1000 * 60 * 60 * 1.25),
				status: "completed",
				summary: "One job, market position, and ICP ready to test.",
				title: "Strategy pass · Expense Tracker",
			},
		],
		schemaVersion: 2,
		stages: [
			stageSnapshot("wedge", 100, "Track business expenses", 1000 * 60 * 2),
			stageSnapshot(
				"positioning",
				86,
				"Focused specialist between capture and tax prep",
				1000 * 60 * 7
			),
			stageSnapshot(
				"icp",
				78,
				"Independent consultants without a finance team",
				1000 * 60 * 12
			),
			stageSnapshot(
				"activation",
				34,
				"Interview before asking for a switch",
				1000 * 60 * 18
			),
		],
		strategy: defaultStrategy(),
	};
}

/** Empty node-owned state. Demo content must never be used for a live host. */
export function emptyState(): AutopilotState {
	const now = new Date().toISOString();
	return {
		active: true,
		agentId: "",
		brief: "",
		companyName: "",
		createdAt: now,
		guardrails: { externalApproval: true, scopedWrites: true },
		lastUpdatedAt: now,
		log: [],
		runs: [],
		schemaVersion: 2,
		stages: STAGES.map(({ id }) => ({
			action: "Not started",
			createdAt: now,
			id,
			progress: 0,
		})),
		strategy: blankStrategy(),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function stageId(value: unknown): StageId {
	if (value === "positioning" || value === "icp" || value === "activation") {
		return value;
	}
	if (value === "build") {
		return "positioning";
	}
	if (value === "reach" || value === "learn") {
		return "activation";
	}
	return "wedge";
}

function normalizeGuardrails(value: unknown): Guardrails {
	if (!isRecord(value)) {
		return { externalApproval: true, scopedWrites: true };
	}
	return {
		externalApproval: value.externalApproval !== false,
		scopedWrites: value.scopedWrites !== false,
	};
}

function normalizeIcp(value: unknown, fallback: IcpProfile): IcpProfile {
	if (!isRecord(value)) {
		return fallback;
	}
	return {
		audience: text(value.audience, fallback.audience),
		buyer: text(value.buyer, fallback.buyer),
		exclude: text(value.exclude, fallback.exclude),
		trigger: text(value.trigger, fallback.trigger),
	};
}

function normalizeActivation(
	value: unknown,
	fallback: ActivationPlan
): ActivationPlan {
	if (!isRecord(value)) {
		return fallback;
	}
	return {
		cta: text(value.cta, fallback.cta),
		headline: text(value.headline, fallback.headline),
		outreach: text(value.outreach, fallback.outreach),
		prepared: boolean(value.prepared, fallback.prepared),
		subhead: text(value.subhead, fallback.subhead),
	};
}

function normalizeStrategy(
	value: unknown,
	legacyBrief: string,
	fallback: StrategyDraft
): StrategyDraft {
	if (!isRecord(value)) {
		return {
			...fallback,
			productDescription: legacyBrief.trim() || fallback.productDescription,
		};
	}
	return {
		activation: normalizeActivation(value.activation, fallback.activation),
		category: text(value.category, fallback.category),
		differentiation: text(value.differentiation, fallback.differentiation),
		icp: normalizeIcp(value.icp, fallback.icp),
		jobBoundary: text(value.jobBoundary, fallback.jobBoundary),
		marketAlternatives: text(
			value.marketAlternatives,
			fallback.marketAlternatives
		),
		marketOpening: text(value.marketOpening, fallback.marketOpening),
		marketStance: text(value.marketStance, fallback.marketStance),
		oneJob: text(value.oneJob, fallback.oneJob),
		positioningStatement: text(
			value.positioningStatement,
			fallback.positioningStatement
		),
		productDescription:
			text(
				value.productDescription,
				legacyBrief || fallback.productDescription
			).trim() || fallback.productDescription,
		productName: text(value.productName, fallback.productName),
		proofTest: text(value.proofTest, fallback.proofTest),
		status: value.status === "ready" ? "ready" : "draft",
		valueProp: text(value.valueProp, fallback.valueProp),
	};
}

function hasCurrentStages(value: unknown): value is unknown[] {
	if (!Array.isArray(value)) {
		return false;
	}
	const ids = new Set(
		value.flatMap((item) => (isRecord(item) ? [item.id] : []))
	);
	return (
		STAGES.every((stage) => ids.has(stage.id)) && ids.size === STAGES.length
	);
}

function normalizeStages(value: unknown): StageSnapshot[] {
	const fallback = demoState().stages;
	if (!hasCurrentStages(value)) {
		return fallback;
	}
	return STAGES.flatMap((definition) => {
		const item = value.find(
			(candidate) => isRecord(candidate) && candidate.id === definition.id
		);
		const fallbackStage = fallback.find(
			(candidate) => candidate.id === definition.id
		);
		if (!(fallbackStage && isRecord(item))) {
			return [];
		}
		return [
			{
				action: text(item.action, fallbackStage.action),
				createdAt: text(item.createdAt, fallbackStage.createdAt),
				id: definition.id,
				progress: Math.min(
					100,
					Math.max(
						0,
						Math.round(finiteNumber(item.progress, fallbackStage.progress))
					)
				),
			},
		];
	});
}

function normalizeLog(value: unknown): AutopilotLogEntry[] {
	if (!Array.isArray(value)) {
		return demoState().log;
	}
	const defaults = demoState().log;
	return value
		.flatMap((item, index) => {
			if (!isRecord(item)) {
				return [];
			}
			const fallback = defaults[index] ?? defaults[0];
			if (!fallback) {
				return [];
			}
			const status: AutopilotLogEntry["status"] =
				item.status === "working" || item.status === "waiting"
					? item.status
					: "done";
			return [
				{
					createdAt: text(item.createdAt, fallback.createdAt),
					detail: text(item.detail, fallback.detail),
					id: text(item.id, `log-${index}`),
					runId: text(item.runId) || undefined,
					stage: stageId(item.stage),
					status,
					title: text(item.title, fallback.title),
				},
			];
		})
		.slice(0, 100);
}

function normalizeRuns(value: unknown): CycleRun[] {
	if (!Array.isArray(value)) {
		return demoState().runs;
	}
	const defaults = demoState().runs;
	return value
		.flatMap((item, index) => {
			if (!isRecord(item)) {
				return [];
			}
			const fallback = defaults[index] ?? defaults[0];
			if (!fallback) {
				return [];
			}
			const status: CycleRun["status"] =
				item.status === "running" || item.status === "failed"
					? item.status
					: "completed";
			return [
				{
					completedAt: text(item.completedAt) || undefined,
					id: text(item.id, `strategy-${index}`),
					startedAt: text(item.startedAt, fallback.startedAt),
					status,
					summary: text(item.summary, fallback.summary),
					title: text(item.title, fallback.title),
				},
			];
		})
		.slice(0, 50);
}

export function normalizeState(value: unknown): AutopilotState {
	const fallback = demoState();
	if (!isRecord(value)) {
		return fallback;
	}
	const legacyBrief = text(value.brief, fallback.brief);
	const strategy = normalizeStrategy(
		value.strategy,
		legacyBrief,
		fallback.strategy
	);
	return {
		agentId: text(value.agentId),
		active: value.active !== false,
		brief: strategy.productDescription,
		companyName:
			text(value.companyName, fallback.companyName).trim() ||
			fallback.companyName,
		createdAt: text(value.createdAt, fallback.createdAt),
		guardrails: normalizeGuardrails(value.guardrails),
		lastUpdatedAt: text(value.lastUpdatedAt, fallback.lastUpdatedAt),
		log: normalizeLog(value.log),
		runs: normalizeRuns(value.runs),
		schemaVersion: 2,
		stages: normalizeStages(value.stages),
		strategy,
	};
}

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

export function startCycle(
	state: AutopilotState,
	brief = state.strategy.productDescription
): { run: CycleRun; state: AutopilotState } {
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
		: new Intl.DateTimeFormat(undefined, {
				hour: "numeric",
				minute: "2-digit",
			}).format(date);
}
