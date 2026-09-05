import type { RyuCatalogSnapshot } from "@ryu/app-host/app-bridge";
import {
	RyuAppActions,
	RyuAppDetail,
	RyuAppField,
	RyuAppMain,
	RyuAppSection,
	RyuAppToolbar,
} from "@ryu/blocks/companion/app-ui";
import { Badge } from "@ryu/ui/components/badge.tsx";
import { Button } from "@ryu/ui/components/button.tsx";
import { Input } from "@ryu/ui/components/input.tsx";
import {
	NativeSelect,
	NativeSelectOption,
} from "@ryu/ui/components/native-select.tsx";
import { Textarea } from "@ryu/ui/components/textarea.tsx";
import {
	type ChangeEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	loadAutopilotState,
	notify,
	runAutopilotCycle,
	saveAutopilotState,
} from "./bridge.ts";
import {
	emptyState,
	failCycle,
	finishCycle,
	markStrategySaved,
	patchState,
	patchStrategy,
	prepareActivation,
	STAGES,
	startCycle,
	timeAgo,
} from "./model.ts";
import type {
	AppMode,
	AutopilotLogEntry,
	AutopilotState,
	AutopilotView,
	IcpProfile,
	StageId,
	StrategyDraft,
} from "./types.ts";

type IconName =
	| "arrow"
	| "brief"
	| "check"
	| "company"
	| "copy"
	| "flag"
	| "mark"
	| "pause"
	| "play"
	| "search"
	| "shield"
	| "spark"
	| "target"
	| "users"
	| "voice";

const VIEW_LABELS: Record<AutopilotView, string> = {
	activation: "Outreach + copy",
	guardrails: "Guardrails",
	icp: "First ICP",
	overview: "Strategy",
	positioning: "Positioning",
};

const STAGE_LABELS: Record<StageId, string> = {
	activation: "Activate",
	icp: "ICP",
	positioning: "Position",
	wedge: "One job",
};

function AppIcon({ name, size = 16 }: { name: IconName; size?: number }) {
	const shared = {
		fill: "none",
		stroke: "currentColor",
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		strokeWidth: 1.7,
	};
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			height={size}
			viewBox="0 0 24 24"
			width={size}
		>
			{(() => {
				switch (name) {
					case "arrow":
						return <path {...shared} d="M5 12h13m-5-5 5 5-5 5" />;
					case "brief":
						return (
							<>
								<path {...shared} d="M6 3.5h8l4 4V20.5H6z" />
								<path {...shared} d="M14 3.5v4h4M9 12h6M9 15.5h6" />
							</>
						);
					case "check":
						return <path {...shared} d="m5.5 12.5 4.2 4.2L18.7 7.7" />;
					case "company":
						return (
							<path
								{...shared}
								d="M4.5 20.5V6.5h9v14M13.5 10.5h6v10M7.5 9.5h2M7.5 13h2M7.5 16.5h2M16 14h1.5M16 17.5h1.5"
							/>
						);
					case "copy":
						return (
							<>
								<path {...shared} d="M8 8h10v12H8z" />
								<path {...shared} d="M6 16H4V4h10v2" />
							</>
						);
					case "flag":
						return (
							<>
								<path {...shared} d="M5 21V4" />
								<path
									{...shared}
									d="M5 5c3-2 5 2 8 0s5 2 6 0v8c-1 2-3-2-6 0s-5-2-8 0"
								/>
							</>
						);
					case "mark":
						return (
							<>
								<path {...shared} d="m12 2 8 4.6v10.8L12 22l-8-4.6V6.6L12 2Z" />
								<path {...shared} d="m4 6.6 8 4.7 8-4.7M12 11.3V22" />
							</>
						);
					case "pause":
						return <path {...shared} d="M8 5v14M16 5v14" />;
					case "play":
						return <path {...shared} d="m8 5 10 7-10 7z" />;
					case "search":
						return (
							<path
								{...shared}
								d="m15.5 15.5 4.5 4.5M10.8 17a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z"
							/>
						);
					case "shield":
						return (
							<path
								{...shared}
								d="M12 3.5 19 6v5.3c0 4.5-2.9 7.7-7 9.2-4.1-1.5-7-4.7-7-9.2V6zM9 12.2l2 2 4-4"
							/>
						);
					case "spark":
						return (
							<path
								{...shared}
								d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4zM19 16l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z"
							/>
						);
					case "target":
						return (
							<>
								<circle {...shared} cx="12" cy="12" r="8" />
								<circle {...shared} cx="12" cy="12" r="4" />
								<circle {...shared} cx="12" cy="12" r="1" />
							</>
						);
					case "users":
						return (
							<>
								<circle {...shared} cx="9" cy="8" r="3" />
								<path
									{...shared}
									d="M3.5 19c.4-3 2.2-4.5 5.5-4.5s5.1 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.7M17 14.8c2.2.4 3.4 1.8 3.6 4.2"
								/>
							</>
						);
					case "voice":
						return <path {...shared} d="M5 6.5h14v9H9l-4 3zM8 10h8M8 13h5" />;
				}
			})()}
		</svg>
	);
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error
		? cause.message
		: "Something went wrong. Try again.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mountView(): AutopilotView {
	const value = (window as unknown as { ryu?: { context?: unknown } }).ryu
		?.context;
	if (isRecord(value)) {
		const section = value.section;
		if (
			section === "activation" ||
			section === "guardrails" ||
			section === "icp" ||
			section === "positioning"
		) {
			return section;
		}
	}
	return "overview";
}

function stageIcon(stage: StageId): IconName {
	return stage === "wedge"
		? "target"
		: stage === "positioning"
			? "flag"
			: stage === "icp"
				? "users"
				: "spark";
}

function logIcon(stage: StageId): IconName {
	return stage === "wedge"
		? "target"
		: stage === "positioning"
			? "flag"
			: stage === "icp"
				? "users"
				: "spark";
}

function agentLabel(
	catalog: RyuCatalogSnapshot | null,
	agentId: string
): string {
	const selected = catalog?.agents.find((agent) => agent.id === agentId);
	return (
		selected?.name ??
		catalog?.agents.find(
			(agent) => agent.installed !== false && agent.enabled !== false
		)?.name ??
		catalog?.current.model ??
		"General"
	);
}

function ModeNote({ mode }: { mode: AppMode }) {
	return (
		<span className="autopilot-mode-note">
			{mode === "demo" ? "Preview node" : "Node-owned"}
		</span>
	);
}

function StatusBadge({ status }: { status: "draft" | "ready" }) {
	return (
		<Badge variant={status === "ready" ? "secondary" : "outline"}>
			{status === "ready" ? "Ready to test" : "Working draft"}
		</Badge>
	);
}

function SectionHeading({
	action,
	children,
}: {
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="autopilot-panel-heading">
			<h2>{children}</h2>
			{action}
		</div>
	);
}

function StrategyStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="autopilot-strategy-stat">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function LinkAction({
	children,
	onClick,
}: {
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<button className="autopilot-link-action" onClick={onClick} type="button">
			{children} <AppIcon name="arrow" size={14} />
		</button>
	);
}

function ProductSetup({
	onChange,
	onRun,
	onSave,
	state,
	working,
}: {
	onChange: (patch: Partial<StrategyDraft>) => void;
	onRun: () => void;
	onSave: () => void;
	state: AutopilotState;
	working: boolean;
}) {
	const strategy = state.strategy;
	return (
		<RyuAppSection className="autopilot-panel autopilot-setup-card">
			<div className="autopilot-setup-kicker">
				<span className="autopilot-eyebrow">Start here</span>
				<StatusBadge status={strategy.status} />
			</div>
			<div className="autopilot-setup-heading">
				<div>
					<h2>Find the wedge before you write the copy.</h2>
					<p>
						Turn a feature list into one job, one audience, and one reason to
						choose you. Everything downstream inherits this decision.
					</p>
				</div>
				<span className="autopilot-setup-mark">
					<AppIcon name="target" size={27} />
				</span>
			</div>
			<div className="autopilot-setup-fields">
				<RyuAppField label="Product name">
					<Input
						aria-label="Product name"
						maxLength={120}
						onChange={(event) => onChange({ productName: event.target.value })}
						value={strategy.productName}
					/>
				</RyuAppField>
				<RyuAppField
					description="Describe the product as it exists today. Autopilot will challenge the feature list and choose a starting job."
					label="What does it do today?"
				>
					<Textarea
						aria-label="What does it do today?"
						maxLength={1000}
						onChange={(event) =>
							onChange({ productDescription: event.target.value })
						}
						value={strategy.productDescription}
					/>
				</RyuAppField>
			</div>
			<div className="autopilot-setup-footer">
				<span className="autopilot-helper-text">
					<AppIcon name="brief" size={14} /> One product brief. No feature
					backlog.
				</span>
				<div className="autopilot-action-row">
					<Button onClick={onSave} size="sm" variant="outline">
						Save brief
					</Button>
					<Button
						disabled={
							working || !strategy.productDescription.trim() || !state.active
						}
						loading={working}
						onClick={onRun}
						size="sm"
					>
						<AppIcon name="spark" size={15} /> Run strategy pass
					</Button>
				</div>
			</div>
		</RyuAppSection>
	);
}

function WedgeCard({
	onOpen,
	strategy,
}: {
	onOpen: () => void;
	strategy: StrategyDraft;
}) {
	return (
		<RyuAppDetail className="autopilot-wedge-card">
			<div className="autopilot-wedge-label">
				<span className="autopilot-eyebrow">The one job</span>
				<Badge variant="default">Wedge</Badge>
			</div>
			<h2>{strategy.oneJob}</h2>
			<p>{strategy.jobBoundary}</p>
			<div className="autopilot-wedge-rule" />
			<div className="autopilot-wedge-meta">
				<span>Decision rule</span>
				<strong>Earn repeat use before adding the next job.</strong>
			</div>
			<LinkAction onClick={onOpen}>Edit the wedge</LinkAction>
		</RyuAppDetail>
	);
}

function ReadinessCard({ strategy }: { strategy: StrategyDraft }) {
	const checks = [
		{ done: Boolean(strategy.oneJob.trim()), label: "One job is explicit" },
		{
			done: Boolean(strategy.category.trim()),
			label: "Market position is named",
		},
		{
			done: Boolean(strategy.icp.audience.trim()),
			label: "First ICP is narrow",
		},
		{
			done: strategy.activation.prepared,
			label: "Activation is ready for review",
		},
	];
	return (
		<RyuAppSection className="autopilot-panel autopilot-readiness-card">
			<span className="autopilot-eyebrow">Ship gate</span>
			<h2>Ship the smallest proof.</h2>
			<p>
				Do not let outreach or copy outrun the strategy that gives them a job.
			</p>
			<div className="autopilot-readiness-list">
				{checks.map((check) => (
					<div className="autopilot-readiness-item" key={check.label}>
						<span className={check.done ? "is-done" : ""}>
							<AppIcon name={check.done ? "check" : "flag"} size={13} />
						</span>
						{check.label}
					</div>
				))}
			</div>
			<p className="autopilot-readiness-note">
				Working hypothesis, not market validation. Let customer evidence earn
				the green light.
			</p>
		</RyuAppSection>
	);
}

function stageView(stage: StageId): AutopilotView {
	return stage === "positioning"
		? "positioning"
		: stage === "icp"
			? "icp"
			: stage === "activation"
				? "activation"
				: "overview";
}

function stageState(
	stage: StageId,
	strategy: StrategyDraft,
	stages: AutopilotState["stages"]
): "ready" | "next" | "waiting" {
	if (stage === "activation") {
		return strategy.activation.prepared ? "ready" : "next";
	}
	const progress = stages.find((item) => item.id === stage)?.progress ?? 0;
	return progress >= 75 ? "ready" : progress > 0 ? "next" : "waiting";
}

function stageStateLabel(status: "ready" | "next" | "waiting"): string {
	return status === "ready" ? "Ready" : status === "next" ? "Next" : "Waiting";
}

function StrategyChain({
	onGo,
	state,
}: {
	onGo: (view: AutopilotView) => void;
	state: AutopilotState;
}) {
	return (
		<RyuAppSection
			aria-label="Launch strategy chain"
			className="autopilot-panel autopilot-chain-panel"
		>
			<SectionHeading
				action={
					<span className="autopilot-panel-note">Downstream by design</span>
				}
			>
				The launch chain
			</SectionHeading>
			<p className="autopilot-panel-description">
				Each answer narrows the next one. Change the wedge and the activation
				pack needs a fresh review.
			</p>
			<div className="autopilot-chain-grid">
				{STAGES.map((stage, index) => {
					const status = stageState(stage.id, state.strategy, state.stages);
					return (
						<button
							className="autopilot-chain-step"
							key={stage.id}
							onClick={() => onGo(stageView(stage.id))}
							type="button"
						>
							<span className="autopilot-chain-index">0{index + 1}</span>
							<span className="autopilot-chain-icon">
								<AppIcon name={stageIcon(stage.id)} size={16} />
							</span>
							<span className="autopilot-chain-copy">
								<strong>{stage.label}</strong>
								<span>{stage.detail}</span>
							</span>
							<span className={`autopilot-chain-status is-${status}`}>
								{stageStateLabel(status)}
							</span>
							{index < STAGES.length - 1 ? (
								<span className="autopilot-chain-arrow">
									<AppIcon name="arrow" size={14} />
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</RyuAppSection>
	);
}

function MarketPreview({
	onOpen,
	strategy,
}: {
	onOpen: () => void;
	strategy: StrategyDraft;
}) {
	return (
		<RyuAppSection className="autopilot-panel autopilot-preview-card">
			<SectionHeading action={<LinkAction onClick={onOpen}>Open</LinkAction>}>
				Market position
			</SectionHeading>
			<Badge variant="outline">Hypothesis</Badge>
			<StrategyStat label="Category" value={strategy.category} />
			<StrategyStat label="Stand" value={strategy.marketStance} />
			<StrategyStat label="Opening" value={strategy.marketOpening} />
		</RyuAppSection>
	);
}

function IcpPreview({
	onOpen,
	strategy,
}: {
	onOpen: () => void;
	strategy: StrategyDraft;
}) {
	return (
		<RyuAppSection className="autopilot-panel autopilot-preview-card">
			<SectionHeading action={<LinkAction onClick={onOpen}>Open</LinkAction>}>
				First ICP
			</SectionHeading>
			<Badge variant="outline">Narrow by design</Badge>
			<StrategyStat label="Who" value={strategy.icp.audience} />
			<StrategyStat label="Trigger" value={strategy.icp.trigger} />
			<StrategyStat label="Buyer" value={strategy.icp.buyer} />
		</RyuAppSection>
	);
}

function ActivationPreview({
	onOpen,
	strategy,
}: {
	onOpen: () => void;
	strategy: StrategyDraft;
}) {
	return (
		<RyuAppSection className="autopilot-panel autopilot-preview-card">
			<SectionHeading action={<LinkAction onClick={onOpen}>Open</LinkAction>}>
				Outreach + copy
			</SectionHeading>
			<Badge variant={strategy.activation.prepared ? "secondary" : "outline"}>
				{strategy.activation.prepared ? "Ready for review" : "Follows the ICP"}
			</Badge>
			<StrategyStat label="First motion" value={strategy.activation.outreach} />
			<StrategyStat label="Headline" value={strategy.activation.headline} />
		</RyuAppSection>
	);
}

function LogRow({
	entry,
	onSelect,
	selected,
}: {
	entry: AutopilotLogEntry;
	onSelect?: () => void;
	selected?: boolean;
}) {
	const content = (
		<>
			<span className="autopilot-log-icon">
				<AppIcon name={logIcon(entry.stage)} size={15} />
			</span>
			<span className="autopilot-log-copy">
				<strong className="autopilot-log-title">
					{entry.title}
					<span className="autopilot-log-stage">
						{STAGE_LABELS[entry.stage]}
					</span>
				</strong>
				<span className="autopilot-log-detail">{entry.detail}</span>
			</span>
			<span className="autopilot-log-time">{timeAgo(entry.createdAt)}</span>
		</>
	);
	if (!onSelect) {
		return <div className="autopilot-log-row">{content}</div>;
	}
	return (
		<button
			className="autopilot-log-row"
			data-selected={selected ? "true" : "false"}
			onClick={onSelect}
			type="button"
		>
			{content}
		</button>
	);
}

function ActivityPanel({
	entries,
	onOpen,
	onSelect,
	selectedId,
}: {
	entries: AutopilotLogEntry[];
	onOpen: () => void;
	onSelect: (id: string) => void;
	selectedId: string | null;
}) {
	return (
		<RyuAppSection className="autopilot-panel autopilot-activity-panel">
			<SectionHeading
				action={<LinkAction onClick={onOpen}>Open activation</LinkAction>}
			>
				Activity
			</SectionHeading>
			{entries.length === 0 ? (
				<div className="autopilot-empty">
					Your first strategy pass will appear here.
				</div>
			) : (
				<div className="autopilot-log-list">
					{entries.slice(0, 4).map((entry) => (
						<LogRow
							entry={entry}
							key={entry.id}
							onSelect={() => onSelect(entry.id)}
							selected={selectedId === entry.id}
						/>
					))}
				</div>
			)}
		</RyuAppSection>
	);
}

function OverviewView({
	mode,
	onGo,
	onPrepareActivation,
	onRun,
	onSave,
	onSelectLog,
	onStrategyChange,
	selectedLogId,
	state,
	working,
}: {
	mode: AppMode;
	onGo: (view: AutopilotView) => void;
	onPrepareActivation: () => void;
	onRun: () => void;
	onSave: () => void;
	onSelectLog: (id: string) => void;
	onStrategyChange: (patch: Partial<StrategyDraft>) => void;
	selectedLogId: string | null;
	state: AutopilotState;
	working: boolean;
}) {
	return (
		<>
			<div className="autopilot-heading-row">
				<div>
					<span className="autopilot-eyebrow">
						Positioning-first launch desk
					</span>
					<h1>Make the first thing obvious.</h1>
					<p>
						Autopilot helps you choose what the product is for before it asks
						anyone to buy, reply, or care.
					</p>
				</div>
				<ModeNote mode={mode} />
			</div>
			<div className="autopilot-overview-grid">
				<div className="autopilot-primary-column">
					<ProductSetup
						onChange={onStrategyChange}
						onRun={onRun}
						onSave={onSave}
						state={state}
						working={working}
					/>
					<StrategyChain onGo={onGo} state={state} />
					<div className="autopilot-preview-grid">
						<MarketPreview
							onOpen={() => onGo("positioning")}
							strategy={state.strategy}
						/>
						<IcpPreview onOpen={() => onGo("icp")} strategy={state.strategy} />
						<ActivationPreview
							onOpen={() => onGo("activation")}
							strategy={state.strategy}
						/>
					</div>
					<ActivityPanel
						entries={state.log}
						onOpen={() => onGo("activation")}
						onSelect={onSelectLog}
						selectedId={selectedLogId}
					/>
				</div>
				<aside className="autopilot-side-column">
					<WedgeCard
						onOpen={() => onGo("positioning")}
						strategy={state.strategy}
					/>
					<ReadinessCard strategy={state.strategy} />
					<RyuAppSection className="autopilot-panel autopilot-side-action">
						<span className="autopilot-eyebrow">Next downstream move</span>
						<strong>
							{state.strategy.activation.prepared
								? "Review the proof test"
								: "Prepare outreach + copy"}
						</strong>
						<p>
							{state.strategy.activation.prepared
								? "The activation pack is staged. Review it before any external send."
								: "Once the ICP is clear, derive the first conversation and landing-page language."}
						</p>
						<Button
							onClick={
								state.strategy.activation.prepared
									? () => onGo("activation")
									: onPrepareActivation
							}
							size="sm"
							variant="outline"
						>
							{state.strategy.activation.prepared
								? "Review pack"
								: "Prepare pack"}{" "}
							<AppIcon name="arrow" size={14} />
						</Button>
					</RyuAppSection>
				</aside>
			</div>
		</>
	);
}

function ViewHeader({
	action,
	view,
}: {
	action?: ReactNode;
	view: AutopilotView;
}) {
	return (
		<div className="autopilot-view-header">
			<div>
				<span className="autopilot-eyebrow">Strategy workspace</span>
				<h1>{VIEW_LABELS[view]}</h1>
				<p>
					{view === "positioning"
						? "Name the category, alternatives, and reason to choose before adding another feature."
						: view === "icp"
							? "Choose the first buyer by situation and trigger, then say who is deliberately out of scope."
							: view === "activation"
								? "Outreach and copy are downstream outputs. Review them against the same job and ICP."
								: "Keep external sends reviewable and each strategy pass inside the selected Ryu boundary."}
				</p>
			</div>
			{action}
		</div>
	);
}

function PositioningView({
	onChange,
	onRun,
	onSave,
	state,
	working,
}: {
	onChange: (patch: Partial<StrategyDraft>) => void;
	onRun: () => void;
	onSave: () => void;
	state: AutopilotState;
	working: boolean;
}) {
	const strategy = state.strategy;
	return (
		<>
			<ViewHeader
				action={
					<Button
						disabled={working}
						loading={working}
						onClick={onRun}
						size="sm"
					>
						<AppIcon name="spark" size={15} /> Run strategy pass
					</Button>
				}
				view="positioning"
			/>
			<div className="autopilot-page-grid">
				<RyuAppSection className="autopilot-panel autopilot-form-panel">
					<SectionHeading>Write the market claim</SectionHeading>
					<RyuAppField label="The one job">
						<Textarea
							aria-label="The one job"
							maxLength={300}
							onChange={(event) => onChange({ oneJob: event.target.value })}
							value={strategy.oneJob}
						/>
					</RyuAppField>
					<RyuAppField
						description="This is the boundary that keeps the first release legible."
						label="What it will not do yet"
					>
						<Textarea
							aria-label="What it will not do yet"
							maxLength={400}
							onChange={(event) =>
								onChange({ jobBoundary: event.target.value })
							}
							value={strategy.jobBoundary}
						/>
					</RyuAppField>
					<RyuAppField label="Category">
						<Input
							aria-label="Category"
							maxLength={200}
							onChange={(event) => onChange({ category: event.target.value })}
							value={strategy.category}
						/>
					</RyuAppField>
					<RyuAppField label="Why choose this over the alternative?">
						<Textarea
							aria-label="Why choose this over the alternative?"
							maxLength={500}
							onChange={(event) =>
								onChange({ differentiation: event.target.value })
							}
							value={strategy.differentiation}
						/>
					</RyuAppField>
					<RyuAppField label="Value proposition">
						<Textarea
							aria-label="Value proposition"
							maxLength={400}
							onChange={(event) => onChange({ valueProp: event.target.value })}
							value={strategy.valueProp}
						/>
					</RyuAppField>
					<RyuAppField label="Positioning statement">
						<Textarea
							aria-label="Positioning statement"
							maxLength={900}
							onChange={(event) =>
								onChange({ positioningStatement: event.target.value })
							}
							value={strategy.positioningStatement}
						/>
					</RyuAppField>
					<RyuAppActions className="autopilot-form-actions">
						<Button onClick={onSave} size="sm">
							Save positioning
						</Button>
					</RyuAppActions>
				</RyuAppSection>
				<RyuAppSection className="autopilot-panel autopilot-insight-panel">
					<div className="autopilot-insight-kicker">
						<span className="autopilot-eyebrow">Market read</span>
						<Badge variant="outline">Hypothesis</Badge>
					</div>
					<h2>{strategy.marketStance}</h2>
					<p className="autopilot-insight-lede">
						Your opening is not “more features.” It is a sharper job for a
						specific buyer at a specific moment.
					</p>
					<StrategyStat
						label="Alternatives today"
						value={strategy.marketAlternatives}
					/>
					<StrategyStat
						label="White-space opening"
						value={strategy.marketOpening}
					/>
					<div className="autopilot-statement-block">
						<span>One-line claim</span>
						<p>{strategy.positioningStatement}</p>
					</div>
					<div className="autopilot-insight-rule">
						<AppIcon name="flag" size={15} />
						<strong>Positioning is a choice, not a feature inventory.</strong>
					</div>
				</RyuAppSection>
			</div>
		</>
	);
}

function IcpView({
	onChange,
	onSave,
	state,
}: {
	onChange: (patch: Partial<StrategyDraft>) => void;
	onSave: () => void;
	state: AutopilotState;
}) {
	const strategy = state.strategy;
	const updateIcp = (patch: Partial<IcpProfile>) =>
		onChange({ icp: { ...strategy.icp, ...patch } });
	return (
		<>
			<ViewHeader view="icp" />
			<div className="autopilot-page-grid">
				<RyuAppSection className="autopilot-panel autopilot-form-panel">
					<SectionHeading>Make the audience smaller</SectionHeading>
					<RyuAppField
						description="Describe a reachable group with a shared situation, not a demographic cloud."
						label="First ICP"
					>
						<Textarea
							aria-label="First ICP"
							maxLength={500}
							onChange={(event) => updateIcp({ audience: event.target.value })}
							value={strategy.icp.audience}
						/>
					</RyuAppField>
					<RyuAppField label="Buying trigger">
						<Textarea
							aria-label="Buying trigger"
							maxLength={400}
							onChange={(event) => updateIcp({ trigger: event.target.value })}
							value={strategy.icp.trigger}
						/>
					</RyuAppField>
					<RyuAppField label="Likely buyer">
						<Input
							aria-label="Likely buyer"
							maxLength={200}
							onChange={(event) => updateIcp({ buyer: event.target.value })}
							value={strategy.icp.buyer}
						/>
					</RyuAppField>
					<RyuAppField label="Out of scope for now">
						<Textarea
							aria-label="Out of scope for now"
							maxLength={400}
							onChange={(event) => updateIcp({ exclude: event.target.value })}
							value={strategy.icp.exclude}
						/>
					</RyuAppField>
					<RyuAppField
						description="A testable behavior is more useful than a confidence score."
						label="Proof to collect"
					>
						<Textarea
							aria-label="Proof to collect"
							maxLength={500}
							onChange={(event) => onChange({ proofTest: event.target.value })}
							value={strategy.proofTest}
						/>
					</RyuAppField>
					<RyuAppActions className="autopilot-form-actions">
						<Button onClick={onSave} size="sm">
							Save ICP
						</Button>
					</RyuAppActions>
				</RyuAppSection>
				<RyuAppSection className="autopilot-panel autopilot-insight-panel">
					<div className="autopilot-insight-kicker">
						<span className="autopilot-eyebrow">The narrowing test</span>
						<Badge variant="secondary">Specific beats broad</Badge>
					</div>
					<h2>Would this person recognize the problem this week?</h2>
					<div className="autopilot-icp-lens">
						<StrategyStat label="Audience" value={strategy.icp.audience} />
						<StrategyStat label="Moment" value={strategy.icp.trigger} />
						<StrategyStat label="Decision maker" value={strategy.icp.buyer} />
					</div>
					<div className="autopilot-boundary-block">
						<span>Do not target yet</span>
						<p>{strategy.icp.exclude}</p>
					</div>
					<div className="autopilot-proof-block">
						<span>First proof</span>
						<p>{strategy.proofTest}</p>
					</div>
				</RyuAppSection>
			</div>
		</>
	);
}

function ActivationView({
	onChange,
	onPrepare,
	onSave,
	state,
}: {
	onChange: (patch: Partial<StrategyDraft>) => void;
	onPrepare: () => void;
	onSave: () => void;
	state: AutopilotState;
}) {
	const strategy = state.strategy;
	const activation = strategy.activation;
	const updateActivation = (patch: Partial<typeof activation>) =>
		onChange({ activation: { ...activation, ...patch } });
	return (
		<>
			<ViewHeader
				action={
					<Button onClick={onPrepare} size="sm">
						<AppIcon name="check" size={15} />
						{activation.prepared
							? "Refresh review pack"
							: "Prepare review pack"}
					</Button>
				}
				view="activation"
			/>
			<div className="autopilot-activation-context">
				<span className="autopilot-eyebrow">Inherited from the strategy</span>
				<strong>{strategy.oneJob}</strong>
				<span>for</span>
				<strong>{strategy.icp.audience}</strong>
			</div>
			<div className="autopilot-activation-grid">
				<RyuAppSection className="autopilot-panel autopilot-form-panel">
					<SectionHeading
						action={
							<Badge variant={activation.prepared ? "secondary" : "outline"}>
								{activation.prepared ? "Ready for review" : "Draft"}
							</Badge>
						}
					>
						Outreach motion
					</SectionHeading>
					<RyuAppField
						description="Start with a conversation or small proof test. Sending stays inside the destination app's approval flow."
						label="First outreach"
					>
						<Textarea
							aria-label="First outreach"
							maxLength={700}
							onChange={(event) =>
								updateActivation({ outreach: event.target.value })
							}
							value={activation.outreach}
						/>
					</RyuAppField>
					<RyuAppField label="Proof checkpoint">
						<Textarea
							aria-label="Proof checkpoint"
							maxLength={500}
							onChange={(event) => onChange({ proofTest: event.target.value })}
							value={strategy.proofTest}
						/>
					</RyuAppField>
					<RyuAppActions className="autopilot-form-actions">
						<Button onClick={onSave} size="sm" variant="outline">
							Save activation
						</Button>
					</RyuAppActions>
				</RyuAppSection>
				<RyuAppSection className="autopilot-panel autopilot-copy-panel">
					<SectionHeading>
						<span className="autopilot-heading-with-icon">
							<AppIcon name="copy" size={16} /> Copy follows
						</span>
					</SectionHeading>
					<p className="autopilot-panel-description">
						Same job. Same audience. Same promise. Edit the language here, but
						do not let it invent a broader product.
					</p>
					<RyuAppField label="Landing page headline">
						<Input
							aria-label="Landing page headline"
							maxLength={180}
							onChange={(event) =>
								updateActivation({ headline: event.target.value })
							}
							value={activation.headline}
						/>
					</RyuAppField>
					<RyuAppField label="Subhead">
						<Textarea
							aria-label="Subhead"
							maxLength={400}
							onChange={(event) =>
								updateActivation({ subhead: event.target.value })
							}
							value={activation.subhead}
						/>
					</RyuAppField>
					<RyuAppField label="Call to action">
						<Input
							aria-label="Call to action"
							maxLength={120}
							onChange={(event) =>
								updateActivation({ cta: event.target.value })
							}
							value={activation.cta}
						/>
					</RyuAppField>
					<div className="autopilot-copy-preview">
						<span className="autopilot-eyebrow">Preview</span>
						<h2>{activation.headline}</h2>
						<p>{activation.subhead}</p>
						<Button size="sm">{activation.cta}</Button>
					</div>
				</RyuAppSection>
			</div>
			<RyuAppSection className="autopilot-panel autopilot-review-note">
				<span className="autopilot-review-icon">
					<AppIcon name="shield" size={16} />
				</span>
				<div>
					<strong>Review before anything leaves the node.</strong>
					<p>
						Preparing this pack changes Autopilot's local strategy record only.
						Any message send remains gated by the destination app and its
						approval policy.
					</p>
				</div>
			</RyuAppSection>
		</>
	);
}

function GuardrailsView({
	catalog,
	onAgentChange,
	onGuardrailChange,
	state,
	working,
}: {
	catalog: RyuCatalogSnapshot | null;
	onAgentChange: (event: ChangeEvent<HTMLSelectElement>) => void;
	onGuardrailChange: (key: keyof AutopilotState["guardrails"]) => void;
	state: AutopilotState;
	working: boolean;
}) {
	const agents =
		catalog?.agents.filter(
			(agent) => agent.installed !== false && agent.enabled !== false
		) ?? [];
	return (
		<>
			<ViewHeader view="guardrails" />
			<div className="autopilot-page-grid">
				<RyuAppSection className="autopilot-panel autopilot-form-panel">
					<SectionHeading>Company boundaries</SectionHeading>
					<label className="autopilot-check">
						<input
							checked={state.guardrails.externalApproval}
							onChange={() => onGuardrailChange("externalApproval")}
							type="checkbox"
						/>
						<span>
							<strong>External sends require approval</strong>
							Keep outreach inside the destination app's review or approval
							flow.
						</span>
					</label>
					<label className="autopilot-check">
						<input
							checked={state.guardrails.scopedWrites}
							onChange={() => onGuardrailChange("scopedWrites")}
							type="checkbox"
						/>
						<span>
							<strong>Writes stay scoped to enabled apps</strong>
							The selected agent cannot broaden its own tool grants.
						</span>
					</label>
					<div className="autopilot-policy-callout">
						<AppIcon name="shield" size={16} />
						<div>
							<strong>
								{state.guardrails.externalApproval &&
								state.guardrails.scopedWrites
									? "Bounded autonomy"
									: "Review recommended"}
							</strong>
							<span>
								Strategy work remains local until you choose to activate it.
							</span>
						</div>
					</div>
				</RyuAppSection>
				<RyuAppSection className="autopilot-panel autopilot-insight-panel">
					<SectionHeading>Agent lane</SectionHeading>
					<RyuAppField
						description="Autopilot delegates one bounded strategy pass at a time. The selected agent keeps its own model and tool configuration."
						label="Run strategy passes with"
					>
						<NativeSelect
							aria-label="Autopilot agent lane"
							disabled={working}
							onChange={onAgentChange}
							value={state.agentId}
						>
							<NativeSelectOption value="">
								General · node default
							</NativeSelectOption>
							{agents.map((agent) => (
								<NativeSelectOption key={agent.id} value={agent.id}>
									{agent.name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</RyuAppField>
					<StrategyStat
						label="Selected lane"
						value={agentLabel(catalog, state.agentId)}
					/>
					<StrategyStat
						label="Runtime boundary"
						value="Ryu agent + enabled apps"
					/>
				</RyuAppSection>
			</div>
		</>
	);
}

export function App() {
	const [catalog, setCatalog] = useState<RyuCatalogSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<AppMode>("demo");
	const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
	const [state, setState] = useState<AutopilotState | null>(null);
	const [view, setView] = useState<AutopilotView>(mountView);
	const [working, setWorking] = useState(false);
	const [loading, setLoading] = useState(true);

	const persist = useCallback(
		(next: AutopilotState) => {
			setState(next);
			void saveAutopilotState(next, mode).catch((cause) =>
				setError(errorMessage(cause))
			);
		},
		[mode]
	);

	useEffect(() => {
		let disposed = false;
		void loadAutopilotState()
			.then((loaded) => {
				if (disposed) {
					return;
				}
				setCatalog(loaded.catalog);
				setMode(loaded.mode);
				setState(loaded.state);
				setSelectedLogId(loaded.state.log[0]?.id ?? null);
			})
			.catch((cause) => {
				if (!disposed) {
					setState(emptyState());
					setError(errorMessage(cause));
				}
			})
			.finally(() => {
				if (!disposed) {
					setLoading(false);
				}
			});
		return () => {
			disposed = true;
		};
	}, []);

	const handleStrategyChange = useCallback((patch: Partial<StrategyDraft>) => {
		setState((current) => (current ? patchStrategy(current, patch) : current));
	}, []);

	const handleSave = useCallback(() => {
		if (!state) {
			return;
		}
		persist(markStrategySaved(state));
		notify({
			description: "The next strategy pass will use this draft.",
			title: "Strategy saved",
			variant: "success",
		});
	}, [persist, state]);

	const handleToggleActive = useCallback(() => {
		if (!state) {
			return;
		}
		const next = patchState(state, { active: !state.active });
		persist(next);
		notify({
			title: next.active ? "Autopilot resumed" : "Autopilot paused",
			variant: "default",
		});
	}, [persist, state]);

	const handleAgentChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			if (state) {
				persist(patchState(state, { agentId: event.target.value }));
			}
		},
		[persist, state]
	);

	const handleGuardrailChange = useCallback(
		(key: keyof AutopilotState["guardrails"]) => {
			if (state) {
				persist(
					patchState(state, {
						guardrails: {
							...state.guardrails,
							[key]: !state.guardrails[key],
						},
					})
				);
			}
		},
		[persist, state]
	);

	const handlePrepareActivation = useCallback(() => {
		if (!state) {
			return;
		}
		persist(prepareActivation(state));
		notify({
			description: "Review the pack before any external send.",
			title: "Activation pack ready",
			variant: "success",
		});
	}, [persist, state]);

	const handleRun = useCallback(async () => {
		if (
			!state ||
			working ||
			!state.strategy.productDescription.trim() ||
			!state.active
		) {
			return;
		}
		setWorking(true);
		setError(null);
		const prepared = startCycle(state);
		setState(prepared.state);
		setSelectedLogId(prepared.state.log[0]?.id ?? null);
		void saveAutopilotState(prepared.state, mode).catch((cause) =>
			setError(errorMessage(cause))
		);
		try {
			const defaultAgentId =
				catalog?.agents.find(
					(agent) => agent.installed !== false && agent.enabled !== false
				)?.id ?? "";
			const report = await runAutopilotCycle(
				state.strategy,
				state.agentId || defaultAgentId,
				state.guardrails
			);
			const next = finishCycle(prepared.state, prepared.run.id, report);
			persist(next);
			setSelectedLogId(next.log[0]?.id ?? null);
			notify({
				description:
					"Review the wedge, ICP, and activation outputs before using them.",
				title: "Strategy pass completed",
				variant: "success",
			});
		} catch (cause) {
			const message = errorMessage(cause);
			const failed = failCycle(prepared.state, prepared.run.id, message);
			persist(failed);
			setSelectedLogId(failed.log[0]?.id ?? null);
			setError(message);
			notify({
				description: message,
				title: "Strategy pass needs attention",
				variant: "error",
			});
		} finally {
			setWorking(false);
		}
	}, [catalog, mode, persist, state, working]);

	if (loading || !state) {
		return (
			<div className="autopilot-loading" role="status">
				Opening Autopilot…
			</div>
		);
	}

	const selectedLog = state.log.find((entry) => entry.id === selectedLogId);
	return (
		<div className="autopilot-root">
			<RyuAppToolbar className="autopilot-toolbar">
				<div className="autopilot-brand">
					<span className="autopilot-brand-mark">
						<AppIcon name="mark" size={29} />
					</span>
					<strong className="autopilot-brand-name">autopilot</strong>
					<span className="autopilot-brand-product">
						<AppIcon name="brief" size={14} /> {state.strategy.productName}
					</span>
				</div>
				<div className="autopilot-toolbar-actions">
					<span className="autopilot-status">
						<span
							aria-hidden="true"
							className="autopilot-status-dot"
							data-active={state.active ? "true" : "false"}
						/>
						{state.active ? "Strategy desk active" : "Strategy desk paused"}
					</span>
					<Button
						className="autopilot-compact-control"
						onClick={handleToggleActive}
						size="sm"
						variant="outline"
					>
						<AppIcon name={state.active ? "pause" : "play"} size={14} />
						{state.active ? "Pause" : "Resume"}
					</Button>
					<div className="autopilot-agent-control">
						<span id="autopilot-agent-label">Agent</span>
						<NativeSelect
							aria-labelledby="autopilot-agent-label"
							id="autopilot-agent-lane"
							onChange={handleAgentChange}
							value={state.agentId}
						>
							<NativeSelectOption value="">
								{agentLabel(catalog, state.agentId)}
							</NativeSelectOption>
							{catalog?.agents
								.filter(
									(agent) =>
										agent.installed !== false && agent.enabled !== false
								)
								.map((agent) => (
									<NativeSelectOption key={agent.id} value={agent.id}>
										{agent.name}
									</NativeSelectOption>
								))}
						</NativeSelect>
					</div>
				</div>
			</RyuAppToolbar>
			<RyuAppMain className="autopilot-main">
				{error ? (
					<div aria-live="polite" className="autopilot-alert" role="alert">
						<span>{error}</span>
						<Button
							onClick={() => setError(null)}
							size="xs"
							variant="ghost-muted"
						>
							Dismiss
						</Button>
					</div>
				) : null}
				{view === "overview" ? (
					<OverviewView
						mode={mode}
						onGo={setView}
						onPrepareActivation={handlePrepareActivation}
						onRun={handleRun}
						onSave={handleSave}
						onSelectLog={setSelectedLogId}
						onStrategyChange={handleStrategyChange}
						selectedLogId={selectedLog?.id ?? null}
						state={state}
						working={working}
					/>
				) : null}
				{view === "positioning" ? (
					<PositioningView
						onChange={handleStrategyChange}
						onRun={handleRun}
						onSave={handleSave}
						state={state}
						working={working}
					/>
				) : null}
				{view === "icp" ? (
					<IcpView
						onChange={handleStrategyChange}
						onSave={handleSave}
						state={state}
					/>
				) : null}
				{view === "activation" ? (
					<ActivationView
						onChange={handleStrategyChange}
						onPrepare={handlePrepareActivation}
						onSave={handleSave}
						state={state}
					/>
				) : null}
				{view === "guardrails" ? (
					<GuardrailsView
						catalog={catalog}
						onAgentChange={handleAgentChange}
						onGuardrailChange={handleGuardrailChange}
						state={state}
						working={working}
					/>
				) : null}
			</RyuAppMain>
		</div>
	);
}
