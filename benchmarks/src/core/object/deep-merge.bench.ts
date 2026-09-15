import assert from "node:assert";

import {
	beforeEach,
	durationCase,
	durationCondition,
} from "@ac-bench/measure-duration";
import { merge } from "@ac-kit/core";
import deepmerge from "deepmerge";
import { merge as lodashMerge } from "lodash-es";

import {
	countNodes,
	makeTree,
	Node,
	withDeepestChange,
} from "./__fixtures__/fixtures.js";

const TREE = makeTree(3, 4);
const SOURCE = withDeepestChange(TREE);
const NODE_COUNT = countNodes(TREE);
const verify = (merged: unknown) =>
	assert.strictEqual(countNodes(merged), NODE_COUNT);

durationCondition(
	`deep merge — two ${NODE_COUNT}-node trees of the same shape`,
	() => {
		let clonedTree: Node;

		beforeEach(() => {
			clonedTree = structuredClone(TREE);
		});

		durationCase(
			"@ac-kit/core merge(recursive:true)",
			{ tags: { kind: "js" } },
			() =>
				verify(
					merge(clonedTree, SOURCE, {
						recursive: true,
						arrayMergeMode: "replace",
					}),
				),
		);
		durationCase("deepmerge (npm)", { tags: { kind: "js" } }, () =>
			verify(deepmerge(clonedTree, SOURCE, { arrayMerge: (_, b) => b })),
		);
		durationCase("lodash merge (npm)", { tags: { kind: "js" } }, () =>
			verify(lodashMerge(clonedTree, SOURCE)),
		);
	},
);
