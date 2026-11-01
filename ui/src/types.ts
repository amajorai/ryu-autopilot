import type { RyuCatalogSnapshot } from "@ryu/app-host/app-bridge";

export type AppMode = "demo" | "live";
export type AutopilotView =
	| "overview"
	| "positioning"
	| "icp"
	| "activation"
	| "guardrails";
export type StageId = "wedge" | "positioning" | "icp" | "activation";
export type LogStatus = "done" | "working" | "waiting";
export type RunStatus = "completed" | "running" | "failed";
export type StrategyStatus = "draft" | "ready";

export interface Guardrails {
	externalApproval: boolean;
	scopedWrites: boolean;
}

export interface IcpProfile {
	audience: string;
	buyer: string;
	exclude: string;
	trigger: string;
}

export interface ActivationPlan {
	cta: string;
	headline: string;
	outreach: string;
	prepared: boolean;
	subhead: string;
}

export interface StrategyDraft {
	activation: ActivationPlan;
	category: string;
	differentiation: string;
	icp: IcpProfile;
	jobBoundary: string;
	marketAlternatives: string;
	marketOpening: string;
	marketStance: string;
	oneJob: string;
	positioningStatement: string;
	productDescription: string;
	productName: string;
	proofTest: string;
	status: StrategyStatus;
	valueProp: string;
}

export interface StageSnapshot {
	action: string;
	createdAt: string;
	id: StageId;
	progress: number;
}

export interface AutopilotLogEntry {
	createdAt: string;
	detail: string;
	id: string;
	runId?: string;
	stage: StageId;
	status: LogStatus;
	title: string;
}

export interface CycleRun {
	completedAt?: string;
	id: string;
	startedAt: string;
	status: RunStatus;
	summary: string;
	title: string;
}

export interface AutopilotState {
	active: boolean;
	agentId: string;
	brief: string;
	companyName: string;
	createdAt: string;
	guardrails: Guardrails;
	lastUpdatedAt: string;
	log: AutopilotLogEntry[];
	runs: CycleRun[];
	schemaVersion: 2;
	stages: StageSnapshot[];
	strategy: StrategyDraft;
}

export interface LoadedAutopilot {
	catalog: RyuCatalogSnapshot | null;
	mode: AppMode;
	state: AutopilotState;
}
