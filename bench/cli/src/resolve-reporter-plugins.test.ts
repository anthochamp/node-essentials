import type { ReporterPlugin } from "@ac-bench/core/plugin";
import { defineReporterPlugin } from "@ac-bench/core/plugin";
import jsonReporter from "@ac-bench/reporter-json";
import { MemorySink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import { resolveReporterPlugins } from "./resolve-reporter-plugins.js";

function fake_(id: string): ReporterPlugin {
	return defineReporterPlugin({ id, createSink: () => new MemorySink() });
}

describe("resolveReporterPlugins", () => {
	it("instantiates a built-in nothing configured", () => {
		const [plugin] = resolveReporterPlugins(["json"], []);

		expect(plugin?.id).toBe("json");
	});

	it("resolves every built-in id", () => {
		const ids = resolveReporterPlugins(
			["table", "json", "markdown", "csv"],
			[],
		).map((plugin) => plugin.id);

		expect(ids).toEqual(["table", "json", "markdown", "csv"]);
	});

	// The only way to give a built-in reporter options: construct it yourself in
	// the config file, and keep selecting it by name.
	it("prefers a configured instance over the built-in of the same id", () => {
		const configured = jsonReporter({ output: "elsewhere.json" });
		const [plugin] = resolveReporterPlugins(["json"], [configured]);

		expect(plugin).toBe(configured);
	});

	it("resolves a third-party id that only the config supplies", () => {
		const configured = fake_("influxdb");
		const [plugin] = resolveReporterPlugins(["influxdb"], [configured]);

		expect(plugin).toBe(configured);
	});

	it("throws for an unknown reporter type, listing what is known", () => {
		expect(() =>
			resolveReporterPlugins(["bogus"], [fake_("influxdb")]),
		).toThrow(/Unknown reporter type: bogus\..*influxdb/s);
	});

	it("throws when two configured plugins claim the same id", () => {
		expect(() =>
			resolveReporterPlugins(["json"], [fake_("json"), fake_("json")]),
		).toThrow("Duplicate reporter plugin id: json");
	});

	it("keeps the order the ids were given in", () => {
		const ids = resolveReporterPlugins(["csv", "table"], []).map(
			(plugin) => plugin.id,
		);

		expect(ids).toEqual(["csv", "table"]);
	});
});
