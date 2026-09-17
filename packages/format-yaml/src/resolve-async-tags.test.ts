import { describe, expect, it } from "vitest";

import type { YamlScalarTag } from "./index.js";
import { parseYamlDocument } from "./parse.js";
import { resolveYamlAsyncTags } from "./resolve-async-tags.js";

const asyncTag: YamlScalarTag = {
	tag: "!async",
	resolve: async (value) => `resolved:${value}`,
};

describe("resolveYamlAsyncTags", () => {
	it("settles promises at every depth of a nested tree", async () => {
		const document = parseYamlDocument(
			[
				"top: !async one",
				"nested:",
				"  seq:",
				"    - !async two",
				"    - deep:",
				"        - !async three",
				"  map:",
				"    ? !async key",
				"    : !async four",
			].join("\n"),
			{ customTags: [asyncTag] },
		);

		await resolveYamlAsyncTags(document);

		expect(document.toJS()).toEqual({
			top: "resolved:one",
			nested: {
				seq: ["resolved:two", { deep: ["resolved:three"] }],
				map: { "resolved:key": "resolved:four" },
			},
		});
	});

	it("leaves a tree with no async tag untouched", async () => {
		const document = parseYamlDocument("a: 1\nb: [2, 3]");

		await resolveYamlAsyncTags(document);

		expect(document.toJS()).toEqual({ a: 1, b: [2, 3] });
	});

	it("accepts a bare node as well as a document", async () => {
		const document = parseYamlDocument("- !async only", {
			customTags: [asyncTag],
		});

		await resolveYamlAsyncTags(document.contents);

		expect(document.toJS()).toEqual(["resolved:only"]);
	});

	it("accepts null", async () => {
		await expect(resolveYamlAsyncTags(null)).resolves.toBeUndefined();
	});
});
