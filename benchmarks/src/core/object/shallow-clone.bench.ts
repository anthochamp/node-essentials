import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clone } from "@ac-kit/core";

import { makeTree, type Node } from "./__fixtures__/fixtures.js";

const TREE = makeTree(3, 4);
const NODE = TREE.children[0] as Node;

durationCondition("shallow clone — one tree node", () => {
	durationCase("@ac-kit/.clone", { tags: { kind: "js" } }, () =>
		assert.strictEqual(clone(NODE).id, NODE.id),
	);
	// the default copies the prototype, symbol keys, non-enumerables and property
	// attributes; spread and Object.assign copy none of them
	durationCase("@ac-kit/.clone (plain)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(
			clone(NODE, {
				prototype: "plain",
				symbolKeys: false,
				nonEnumerable: false,
				descriptors: false,
			}).id,
			NODE.id,
		),
	);
	durationCase("object spread", { tags: { kind: "native" } }, () =>
		assert.strictEqual({ ...NODE }.id, NODE.id),
	);
	durationCase("Object.assign", { tags: { kind: "native" } }, () =>
		assert.strictEqual(Object.assign({}, NODE).id, NODE.id),
	);
});
