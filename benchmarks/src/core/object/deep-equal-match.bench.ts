import assert from "node:assert";
import { isDeepStrictEqual } from "node:util";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { isDeepEqual } from "@ac-kit/core";
import { dequal } from "dequal";
import fastDeepEqual from "fast-deep-equal";
import { isEqual as lodashIsEqual } from "lodash-es";

import { makeTree } from "./__fixtures__/fixtures.js";

const TREE = makeTree(3, 4);
const COPY = structuredClone(TREE);

durationCondition("deep equal — two identical ~1 100-node trees", () => {
	durationCase("@ac-kit/.isDeepEqual", { tags: { kind: "js" } }, () =>
		assert.strictEqual(isDeepEqual(TREE, COPY), true),
	);
	durationCase("util.isDeepStrictEqual", { tags: { kind: "native" } }, () =>
		assert.strictEqual(isDeepStrictEqual(TREE, COPY), true),
	);
	durationCase("fast-deep-equal (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(fastDeepEqual(TREE, COPY), true),
	);
	durationCase("dequal (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(dequal(TREE, COPY), true),
	);
	durationCase("lodash isEqual (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(lodashIsEqual(TREE, COPY), true),
	);
});
