import { MemorySink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import {
	defineReporterPlugin,
	isReporterPlugin,
	REPORTER_PLUGIN_TAG,
} from "./reporter-plugin.js";

describe("defineReporterPlugin", () => {
	it("keeps the spec's members and brands the result", () => {
		const plugin = defineReporterPlugin({
			id: "memory",
			createSink: () => new MemorySink(),
		});

		expect(plugin.id).toBe("memory");
		expect(plugin[REPORTER_PLUGIN_TAG]).toBe(true);
		expect(isReporterPlugin(plugin)).toBe(true);
	});
});

describe("isReporterPlugin", () => {
	it("rejects a matching shape that never went through the factory", () => {
		expect(isReporterPlugin({ id: "memory", createSink: () => null })).toBe(
			false,
		);
	});

	it("rejects non-objects", () => {
		expect(isReporterPlugin(undefined)).toBe(false);
		expect(isReporterPlugin("table")).toBe(false);
	});
});
