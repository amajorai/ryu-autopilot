import type { RpcJsonResponse } from "@ryu/app-host/rpc";
import { demoState, nowIso, STAGES } from "./model-defaults.ts";
import {
	type StoredAutopilotActivation,
	type StoredAutopilotGuardrails,
	type StoredAutopilotIcp,
	type StoredAutopilotLog,
	type StoredAutopilotRuns,
	type StoredAutopilotStages,
	type StoredAutopilotStrategy,
	storedAutopilotStateSchema,
} from "./schemas.ts";
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

function text(value: string | undefined, fallback = ""): string {
	return value ?? fallback;
}
function finiteNumber(value: number | undefined, fallback: number): number {
	return value ?? fallback;
}
function boolean(value: boolean | undefined, fallback: boolean): boolean {
	return value ?? fallback;
}

function stageId(value: string | undefined): StageId {
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

function normalizeGuardrails(
	value: StoredAutopilotGuardrails,
	fallback: Guardrails = { externalApproval: true, scopedWrites: true }
): Guardrails {
	if (value === null) {
		return fallback;
	}
	return {
		externalApproval: boolean(
			value.externalApproval,
			fallback.externalApproval
		),
		scopedWrites: boolean(value.scopedWrites, fallback.scopedWrites),
	};
}

function normalizeIcp(
	value: StoredAutopilotIcp,
	fallback: IcpProfile
): IcpProfile {
	if (value === null) {
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
	value: StoredAutopilotActivation,
	fallback: ActivationPlan
): ActivationPlan {
	if (value === null) {
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
	value: StoredAutopilotStrategy,
	legacyBrief: string,
	fallback: StrategyDraft
): StrategyDraft {
	if (value === null) {
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

function normalizeStages(
	value: StoredAutopilotStages,
	fallback: StageSnapshot[] = demoState().stages
): StageSnapshot[] {
	if (value === null) {
		return fallback;
	}
	const inputById = new Map<
		StageId,
		NonNullable<NonNullable<StoredAutopilotStages>[number]>
	>();
	for (const item of value) {
		if (item === null || item.id === undefined) {
			continue;
		}
		const id = stageId(item.id);
		if (!inputById.has(id)) {
			inputById.set(id, item);
		}
	}
	return STAGES.map((definition) => {
		const item = inputById.get(definition.id);
		const fallbackStage = fallback.find(
			(candidate) => candidate.id === definition.id
		);
		return {
			action: text(item?.action, fallbackStage?.action ?? ""),
			createdAt: text(item?.createdAt, fallbackStage?.createdAt ?? nowIso()),
			id: definition.id,
			progress: Math.min(
				100,
				Math.max(
					0,
					Math.round(finiteNumber(item?.progress, fallbackStage?.progress ?? 0))
				)
			),
		};
	});
}

function normalizeLog(
	value: StoredAutopilotLog,
	fallback: AutopilotLogEntry[] = demoState().log
): AutopilotLogEntry[] {
	if (value === null) {
		return fallback;
	}
	const defaults = fallback;
	return value
		.flatMap((item, index) => {
			if (item === null) {
				return [];
			}
			const fallback = defaults[index] ?? defaults[0];
			const status: AutopilotLogEntry["status"] =
				item.status === "working" || item.status === "waiting"
					? item.status
					: "done";
			return [
				{
					createdAt: text(item.createdAt, fallback?.createdAt ?? nowIso()),
					detail: text(item.detail, fallback?.detail ?? ""),
					id: text(item.id, `log-${index}`),
					runId: text(item.runId) || undefined,
					stage: stageId(item.stage),
					status,
					title: text(item.title, fallback?.title ?? "Untitled activity"),
				},
			];
		})
		.slice(0, 100);
}

function normalizeRuns(
	value: StoredAutopilotRuns,
	fallback: CycleRun[] = demoState().runs
): CycleRun[] {
	if (value === null) {
		return fallback;
	}
	const defaults = fallback;
	return value
		.flatMap((item, index) => {
			if (item === null) {
				return [];
			}
			const fallback = defaults[index] ?? defaults[0];
			const status: CycleRun["status"] =
				item.status === "running" || item.status === "failed"
					? item.status
					: "completed";
			return [
				{
					completedAt: text(item.completedAt) || undefined,
					id: text(item.id, `strategy-${index}`),
					startedAt: text(item.startedAt, fallback?.startedAt ?? nowIso()),
					status,
					summary: text(item.summary, fallback?.summary ?? ""),
					title: text(item.title, fallback?.title ?? "Untitled strategy pass"),
				},
			];
		})
		.slice(0, 50);
}

export function normalizeState(
	input: RpcJsonResponse | undefined,
	fallback: AutopilotState = demoState()
): AutopilotState {
	const value = storedAutopilotStateSchema.parse(input);
	if (value === null) {
		return fallback;
	}
	const legacyBrief = text(value.brief, fallback.brief);
	const strategy = normalizeStrategy(
		value.strategy,
		legacyBrief,
		fallback.strategy
	);
	return {
		agentId: text(value.agentId, fallback.agentId),
		active: value.active !== false,
		brief: strategy.productDescription,
		companyName:
			text(value.companyName, fallback.companyName).trim() ||
			fallback.companyName,
		createdAt: text(value.createdAt, fallback.createdAt),
		guardrails: normalizeGuardrails(value.guardrails, fallback.guardrails),
		lastUpdatedAt: text(value.lastUpdatedAt, fallback.lastUpdatedAt),
		log: normalizeLog(value.log, fallback.log),
		runs: normalizeRuns(value.runs, fallback.runs),
		schemaVersion: 2,
		stages: normalizeStages(value.stages, fallback.stages),
		strategy,
	};
}
