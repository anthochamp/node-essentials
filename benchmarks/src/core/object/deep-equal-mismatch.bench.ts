import assert from "node:assert";
import { isDeepStrictEqual } from "node:util";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { isDeepEqual } from "@ac-kit/core";
import { dequal } from "dequal";
import fastDeepEqual from "fast-deep-equal";
import { isEqual as lodashIsEqual } from "lodash-es";

import { makeTree, withDeepestChange } from "./__fixtures__/fixtures.js";

const TREE = makeTree(3, 4);
const CHANGED = withDeepestChange(TREE);

durationCondition(
	"deep equal — trees differing only in the last leaf visited",
	() => {
		durationCase("@ac-kit/.isDeepEqual", { tags: { kind: "js" } }, () =>
			assert.strictEqual(isDeepEqual(TREE, CHANGED), false),
		);
		durationCase("util.isDeepStrictEqual", { tags: { kind: "native" } }, () =>
			assert.strictEqual(isDeepStrictEqual(TREE, CHANGED), false),
		);
		durationCase("fast-deep-equal (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(fastDeepEqual(TREE, CHANGED), false),
		);
		durationCase("dequal (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(dequal(TREE, CHANGED), false),
		);
		durationCase("lodash isEqual (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(lodashIsEqual(TREE, CHANGED), false),
		);
	},
);
