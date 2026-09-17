import { describe, expect, it } from "vitest";

import { YamlParseError } from "./errors.js";
import { parseYaml } from "./parse.js";

/** Nested anchors, each level multiplying the one below it. */
const ALIAS_BOMB = [
	"a: &a [x, x, x, x, x, x, x, x, x]",
	"b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]",
	"c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b]",
	"d: [*c, *c, *c, *c, *c, *c, *c, *c, *c]",
].join("\n");

function catchThrown(run: () => unknown): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}
	return undefined;
}

describe("parseYaml", () => {
	it("parses a document into a plain value", () => {
		expect(parseYaml("port: 8080\nhosts: [a, b]")).toEqual({
			port: 8080,
			hosts: ["a", "b"],
		});
	});

	it("throws YamlParseError carrying the position it gave up at", () => {
		const error = catchThrown(() => parseYaml("a: 1\n\tb: 2\n"));

		expect(error).toBeInstanceOf(YamlParseError);
		const [first] = (error as YamlParseError).diagnostics;
		expect(first?.line).toBe(2);
		expect(first?.column).toBeGreaterThan(0);
		expect(first?.startOffset).toBeGreaterThan(0);
		expect(first?.endOffset).toBeGreaterThanOrEqual(first?.startOffset ?? 0);
		expect(first?.code).toEqual(expect.any(String));
	});

	it("keeps the underlying diagnostic as the cause", () => {
		const error = catchThrown(() => parseYaml("a: 1\n\tb: 2\n"));

		expect((error as YamlParseError).cause).toBeInstanceOf(Error);
	});

	it("reports every diagnostic, not only the first", () => {
		const error = catchThrown(() => parseYaml("a: [1, 2\nb: {c: 3\n"));

		expect((error as YamlParseError).diagnostics.length).toBeGreaterThan(1);
		expect((error as YamlParseError).message).toContain("further error");
	});

	it("stays quiet about errors at logLevel silent", () => {
		expect(() =>
			parseYaml("a: 1\n\tb: 2\n", { logLevel: "silent" }),
		).not.toThrow();
	});

	it("rejects an alias bomb at the default bound", () => {
		const error = catchThrown(() => parseYaml(ALIAS_BOMB));

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe("parse YAML");
		expect((error as Error).cause).toBeInstanceOf(ReferenceError);
	});

	it("lets a caller-supplied bound win", () => {
		const value = parseYaml(ALIAS_BOMB, { maxAliasCount: -1 }) as {
			d: unknown[];
		};

		expect(value.d).toHaveLength(9);
	});

	it("lets a caller tighten the bound below the default", () => {
		expect(() => parseYaml("a: &a 1\nb: *a", { maxAliasCount: 0 })).toThrow();
		expect(parseYaml("a: &a 1\nb: *a")).toEqual({ a: 1, b: 1 });
	});
});
