import { describe, expect, it } from "vitest";

import {
	type YamlCollectionTag,
	type YamlScalarTag,
	YamlScalar,
	isYamlMap,
	isYamlScalar,
	isYamlSeq,
	visitYaml,
	yamlToJs,
} from "./index.js";
import { parseYaml, parseYamlDocument } from "./parse.js";
import { printYaml } from "./print.js";

// Everything a caller needs to write a custom tag comes from this package; the
// `yaml` package is deliberately not imported here.

const upperTag: YamlScalarTag = {
	tag: "!upper",
	identify: (value) => typeof value === "string",
	resolve: (value) => value.toUpperCase(),
	stringify: (item) => String(item.value).toLowerCase(),
};

const sumTag: YamlCollectionTag = {
	tag: "!sum",
	collection: "seq",
	resolve: (node) =>
		isYamlSeq(node)
			? node.items.reduce<number>(
					(total, item) =>
						total + (isYamlScalar(item) ? Number(item.value) : 0),
					0,
				)
			: 0,
};

describe("yaml-model re-exports", () => {
	it("drive a scalar custom tag end to end", () => {
		expect(parseYaml("value: !upper hi", { customTags: [upperTag] })).toEqual({
			value: "HI",
		});
	});

	it("drive a collection custom tag end to end", () => {
		expect(
			parseYaml("total: !sum [1, 2, 3]", { customTags: [sumTag] }),
		).toEqual({
			total: 6,
		});
	});

	it("drive a custom tag's stringifier", () => {
		const scalar = new YamlScalar("SHOUT");
		scalar.tag = "!upper";

		expect(printYaml(scalar, { customTags: [upperTag] }).trim()).toBe(
			"!upper shout",
		);
	});

	it("expose the node guards and the visitor over a parsed document", () => {
		const document = parseYamlDocument("a: 1\nb: [2, 3]");
		const scalars: unknown[] = [];

		visitYaml(document, {
			Scalar(_key, node) {
				scalars.push(node.value);
			},
		});

		expect(isYamlMap(document.contents)).toBe(true);
		expect(scalars).toEqual(["a", 1, "b", 2, 3]);
	});

	it("expose toJS for converting a node on its own", () => {
		const document = parseYamlDocument("a: [1, 2]");

		expect(yamlToJs(document.contents, null)).toEqual({ a: [1, 2] });
	});
});
