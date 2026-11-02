import { z } from "zod";

// Saved Autopilot v1 records are deliberately sparse. Invalid fields retain
// their previous per-field defaults during migration to the current model.
const text = z.string().optional().catch(undefined);
const flag = z.boolean().optional().catch(undefined);
const guardrails = z
	.object({ externalApproval: flag, scopedWrites: flag })
	.nullable()
	.catch(null);
const icp = z
	.object({ audience: text, buyer: text, exclude: text, trigger: text })
	.nullable()
	.catch(null);
const activation = z
	.object({
		cta: text,
		headline: text,
		outreach: text,
		prepared: flag,
		subhead: text,
	})
	.nullable()
	.catch(null);
const strategy = z
	.object({
		activation,
		category: text,
		differentiation: text,
		icp,
		jobBoundary: text,
		marketAlternatives: text,
		marketOpening: text,
		marketStance: text,
		oneJob: text,
		positioningStatement: text,
		productDescription: text,
		productName: text,
		proofTest: text,
		status: text,
		valueProp: text,
	})
	.nullable()
	.catch(null);
const stage = z
	.object({
		action: text,
		createdAt: text,
		id: text,
		progress: z.number().finite().optional().catch(undefined),
	})
	.nullable()
	.catch(null);
const log = z
	.object({
		createdAt: text,
		detail: text,
		id: text,
		runId: text,
		stage: text,
		status: text,
		title: text,
	})
	.nullable()
	.catch(null);
const run = z
	.object({
		completedAt: text,
		id: text,
		startedAt: text,
		status: text,
		summary: text,
		title: text,
	})
	.nullable()
	.catch(null);
export const storedAutopilotStateSchema = z
	.object({
		active: flag,
		agentId: text,
		brief: text,
		companyName: text,
		createdAt: text,
		guardrails,
		lastUpdatedAt: text,
		log: z.array(log).nullable().catch(null),
		runs: z.array(run).nullable().catch(null),
		stages: z.array(stage).nullable().catch(null),
		strategy,
	})
	.nullable()
	.catch(null);
export type StoredAutopilotState = z.output<typeof storedAutopilotStateSchema>;
export type StoredAutopilotGuardrails = z.output<typeof guardrails>;
export type StoredAutopilotIcp = z.output<typeof icp>;
export type StoredAutopilotActivation = z.output<typeof activation>;
export type StoredAutopilotStrategy = z.output<typeof strategy>;
export type StoredAutopilotStages = z.output<typeof stage>[] | null;
export type StoredAutopilotLog = z.output<typeof log>[] | null;
export type StoredAutopilotRuns = z.output<typeof run>[] | null;

export const autopilotMountViewSchema = z
	.object({
		section: z
			.enum(["activation", "guardrails", "icp", "positioning", "overview"])
			.catch("overview"),
	})
	.transform((value) => value.section)
	.catch("overview");
