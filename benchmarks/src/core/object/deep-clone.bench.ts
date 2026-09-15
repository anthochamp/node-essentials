import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clone } from "@ac-kit/core";
import { klona } from "klona";
import { cloneDeep as lodashCloneDeep } from "lodash-es";
import rfdc from "rfdc";

import { countNodes, makeTree } from "./__fixtures__/fixtures.js";

const rfdcClone = rfdc();
const TREE = makeTree(3, 4);
const NODE_COUNT = countNodes(TREE);
const verify = (copy: unknown) =>
	assert.strictEqual(countNodes(copy), NODE_COUNT);

durationCondition("deep clone — ~1 100-node JSON-safe tree", () => {
	durationCase(
		"@ac-kit/.clone",
		{ tags: { kind: "js", basis: "recursive" } },
		() => verify(clone(TREE, { recursive: true })),
	);
	// the default copies prototypes, symbol keys, non-enumerables and property
	// attributes; every other contender here copies none of them
	durationCase(
		"@ac-kit/.clone (plain)",
		{ tags: { kind: "js", basis: "recursive" } },
		() =>
			verify(
				clone(TREE, {
					recursive: true,
					prototype: "plain",
					symbolKeys: false,
					nonEnumerable: false,
					descriptors: false,
				}),
			),
	);
	durationCase(
		"structuredClone",
		{ tags: { kind: "native", basis: "structuredClone" } },
		() => verify(structuredClone(TREE)),
	);
	durationCase(
		"JSON round trip",
		{ tags: { kind: "native", basis: "serialise" } },
		() => verify(JSON.parse(JSON.stringify(TREE))),
	);
	durationCase("rfdc (npm)", { tags: { kind: "js", basis: "recursive" } }, () =>
		verify(rfdcClone(TREE)),
	);
	durationCase(
		"klona (npm)",
		{ tags: { kind: "js", basis: "recursive" } },
		() => verify(klona(TREE)),
	);
	durationCase(
		"lodash cloneDeep (npm)",
		{ tags: { kind: "js", basis: "recursive" } },
		() => verify(lodashCloneDeep(TREE)),
	);
});
