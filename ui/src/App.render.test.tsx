import { afterEach, expect, test } from "bun:test";
import { RyuAppShell } from "@ryu/blocks/companion/app-ui";
import { Button } from "@ryu/ui/components/button.tsx";
import { Input } from "@ryu/ui/components/input.tsx";
import { Textarea } from "@ryu/ui/components/textarea.tsx";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { ActivationView, ProductSetup, saveBriefDraft } from "./App.tsx";
import { loadAutopilotState, saveAutopilotState } from "./bridge.ts";
import { demoState, patchStrategy, serializeState } from "./model.ts";
import type { StrategyDraft } from "./types.ts";

interface SurfaceProps {
	"aria-label"?: string;
	children?: ReactNode;
	className?: string;
	onChange?: (event: { target: { value: string } }) => void;
	onClick?: () => void;
}
const fieldChangeSchema = z.function({
	input: [z.object({ target: z.object({ value: z.string() }) })],
	output: z.void(),
});
const clickSchema = z.function({ input: [], output: z.void() });
const textNodeSchema = z.union([z.string(), z.number()]);

interface StorageSetInput {
	key: string;
	namespace?: string;
	value: string;
}

function installStorageBridge() {
	let stored: string | null = null;
	const reads: Array<{ key: string; namespace?: string }> = [];
	const writes: StorageSetInput[] = [];
	Reflect.set(globalThis, "window", {
		ryu: {
			storage: {
				get: async (input: { key: string; namespace?: string }) => {
					reads.push(input);
					return stored;
				},
				set: async (input: StorageSetInput) => {
					writes.push(input);
					stored = input.value;
				},
			},
		},
	});
	return { reads, writes };
}

function findElement(
	node: ReactNode,
	predicate: (element: ReactElement<SurfaceProps>) => boolean
): ReactElement<SurfaceProps> | null {
	const children = Array.isArray(node) ? node : [node];
	for (const child of children) {
		if (!isValidElement<SurfaceProps>(child)) {
			continue;
		}
		const element = child;
		if (predicate(element)) {
			return element;
		}
		const nested = findElement(element.props.children, predicate);
		if (nested) {
			return nested;
		}
	}
	return null;
}

function textContent(node: ReactNode): string {
	const text = textNodeSchema.safeParse(node);
	if (text.success) {
		return String(text.data);
	}
	if (Array.isArray(node)) {
		return node.map(textContent).join("");
	}
	if (isValidElement<SurfaceProps>(node)) {
		return textContent(node.props.children);
	}
	return "";
}

function renderSurface(node: ReactNode): string {
	return renderToStaticMarkup(
		<RyuAppShell surface="editor">{node}</RyuAppShell>
	);
}

function changeInput(element: ReactElement<SurfaceProps>, value: string): void {
	const onChange = fieldChangeSchema.parse(element.props.onChange);
	onChange({ target: { value } });
}

afterEach(() => {
	Reflect.set(globalThis, "window", undefined);
});

test("Save brief persists the edited product through the host bridge and reads it back", async () => {
	const bridge = installStorageBridge();
	let state = demoState();
	let saveRequest: Promise<void> | null = null;
	const onChange = (patch: Partial<StrategyDraft>) => {
		state = patchStrategy(state, patch);
	};
	const onSave = () => {
		saveBriefDraft(state, (saved) => {
			state = saved;
			saveRequest = saveAutopilotState(saved, "live");
		});
	};
	const productSetup = () =>
		ProductSetup({
			onChange,
			onRun: () => undefined,
			onSave,
			state,
			working: false,
		});

	let tree = productSetup();
	const productNameInput = findElement(
		tree,
		(element) =>
			element.type === Input && element.props["aria-label"] === "Product name"
	);
	const descriptionInput = findElement(
		tree,
		(element) =>
			element.type === Textarea &&
			element.props["aria-label"] === "What does it do today?"
	);
	if (!(productNameInput && descriptionInput)) {
		throw new Error("Product Setup fields were not rendered.");
	}
	changeInput(productNameInput, "Northstar Books");
	changeInput(descriptionInput, "Reconcile client expenses each Friday.");
	tree = productSetup();
	const markup = renderSurface(tree);
	expect(markup).toContain('aria-label="Product name"');
	expect(markup).toContain('value="Northstar Books"');
	expect(markup).toContain('aria-label="What does it do today?"');
	expect(markup).toContain("Reconcile client expenses each Friday.");

	const saveBriefButton = findElement(
		tree,
		(element) =>
			element.type === Button &&
			textContent(element.props.children).includes("Save brief")
	);
	if (!saveBriefButton) {
		throw new Error("Save brief is not wired to an action.");
	}
	clickSchema.parse(saveBriefButton.props.onClick)();
	if (!saveRequest) {
		throw new Error("Save brief did not start the Autopilot storage write.");
	}
	await saveRequest;

	expect(bridge.writes).toEqual([
		{
			key: "state.v1",
			namespace: "autopilot",
			value: serializeState(state),
		},
	]);
	expect(state.log[0]).toMatchObject({
		stage: "wedge",
		status: "done",
		title: "Strategy draft saved",
	});
	const loaded = await loadAutopilotState();
	expect(loaded.mode).toBe("live");
	expect(loaded.state.strategy.productName).toBe("Northstar Books");
	expect(loaded.state.strategy.productDescription).toBe(
		"Reconcile client expenses each Friday."
	);
	expect(loaded.state.log[0]?.title).toBe("Strategy draft saved");
	expect(bridge.reads).toEqual([{ key: "state.v1", namespace: "autopilot" }]);
});

test("Activation call-to-action updates the rendered preview without acting like a button", () => {
	Reflect.set(globalThis, "window", {});
	let state = demoState();
	const onChange = (patch: Partial<StrategyDraft>) => {
		state = patchStrategy(state, patch);
	};
	const activationView = () =>
		ActivationView({
			onChange,
			onPrepare: () => undefined,
			onSave: () => undefined,
			state,
		});
	let tree = activationView();
	const callToActionInput = findElement(
		tree,
		(element) =>
			element.type === Input && element.props["aria-label"] === "Call to action"
	);
	if (!callToActionInput) {
		throw new Error("The Activation call-to-action field was not rendered.");
	}
	changeInput(callToActionInput, "Request a pricing review");
	tree = activationView();
	const preview = findElement(
		tree,
		(element) => element.props.className === "autopilot-copy-preview"
	);
	if (!preview) {
		throw new Error("The landing-page copy preview was not rendered.");
	}
	expect(textContent(preview.props.children)).toContain(
		"Request a pricing review"
	);
	expect(findElement(preview, (element) => element.type === Button)).toBeNull();
	const markup = renderSurface(tree);
	const previewStart = markup.indexOf('class="autopilot-copy-preview"');
	const previewEnd = markup.indexOf("</div>", previewStart);
	const previewMarkup = markup.slice(previewStart, previewEnd);
	expect(previewMarkup).toContain("Request a pricing review");
	expect(previewMarkup).toContain('<span aria-hidden="true"');
	expect(previewMarkup).not.toContain("<button");
});
