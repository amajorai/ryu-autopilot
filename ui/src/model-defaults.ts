import type {
	AutopilotLogEntry,
	AutopilotState,
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

export function nowIso(offsetMs = 0): string {
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
