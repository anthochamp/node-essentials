import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { TraverseContinue, traverse } from "@ac-kit/core";

import { countNodes, makeTree } from "./__fixtures__/fixtures.js";

const TREE = makeTree(3, 4);

let TRAVERSE_TOTAL = 0;
traverse(TREE, () => {
	TRAVERSE_TOTAL++;
	return TraverseContinue;
});

const WALK_TOTAL = countNodes(TREE);

durationCondition("traverse — every value in a ~1 100-node tree", () => {
	durationCase("@ac-kit/.traverse", { tags: { kind: "js" } }, () => {
		let visited = 0;
		traverse(TREE, () => {
			visited++;
			return TraverseContinue;
		});
		assert.strictEqual(visited, TRAVERSE_TOTAL);
	});
	durationCase("hand-written recursion", { tags: { kind: "native" } }, () =>
		assert.strictEqual(countNodes(TREE), WALK_TOTAL),
	);
	durationCase("JSON.stringify replacer", { tags: { kind: "native" } }, () => {
		let visited = 0;
		JSON.stringify(TREE, (_key, value) => {
			visited++;
			return value;
		});
		assert.strictEqual(visited > 0, true);
	});
});
