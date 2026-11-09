import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// App.tsx is over the file-size limit, so its AppIcon "arrow" is mirrored
// under dir="rtl" by a tailwind.css rule keyed on the path geometry. This
// keeps the rule and the icon in step: change one, and this fails.
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./tailwind.css", import.meta.url), "utf8");

describe("autopilot arrow mirroring", () => {
	test("the RTL rule targets the arrow icon's path", () => {
		const arrow =
			/case "arrow":\s*return <path \{\.\.\.shared\} d="([^"]+)"/.exec(
				app
			)?.[1];
		expect(arrow).toBeDefined();
		const rule = new RegExp(
			String.raw`\[dir="rtl"\] svg:has\(> path\[d="${arrow?.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}"\]\)\s*\{\s*transform: scaleX\(-1\);`
		);
		expect(css).toMatch(rule);
	});
});
