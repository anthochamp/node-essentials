import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";

/**
 * One operation — build a single 3-component value from scalars and read one
 * component back — across the layouts a `Vec3` could use, plus the
 * destination-form variants that write into a caller-supplied target.
 *
 * This is the counterpart to the bulk scan: there, the values already exist and
 * only access cost matters; here, each call allocates one, which is what a
 * per-frame or per-pixel loop actually does.
 */

const CALLS = 10_000;

/** Quarters, so every layout including `Float32Array` is exact. */
function scalar_(index: number): number {
	return (index % 8) / 4;
}

const OFFSET_X = 0.25;
const OFFSET_Y = 0.5;
const OFFSET_Z = 0.75;

const EXPECTED = (() => {
	let total = 0;
	for (let index = 0; index < CALLS; index++) {
		total += scalar_(index) + OFFSET_X;
	}

	return total;
})();

function viaTuple_(): number {
	let sink = 0;
	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out: [number, number, number] = [
			value + OFFSET_X,
			value + OFFSET_Y,
			value + OFFSET_Z,
		];
		sink += out[0];
	}

	return sink;
}

function viaObject_(): number {
	let sink = 0;
	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out = {
			x: value + OFFSET_X,
			y: value + OFFSET_Y,
			z: value + OFFSET_Z,
		};
		sink += out.x;
	}

	return sink;
}

function viaFloat64_(): number {
	let sink = 0;
	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out = new Float64Array(3);
		out[0] = value + OFFSET_X;
		out[1] = value + OFFSET_Y;
		out[2] = value + OFFSET_Z;
		sink += out[0]!;
	}

	return sink;
}

function viaFloat32_(): number {
	let sink = 0;
	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out = new Float32Array(3);
		out[0] = value + OFFSET_X;
		out[1] = value + OFFSET_Y;
		out[2] = value + OFFSET_Z;
		sink += out[0]!;
	}

	return sink;
}

/** The `…Into(out, …)` shape: the caller owns the destination. */
function intoTuple_(): number {
	const out: [number, number, number] = [0, 0, 0];
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		out[0] = value + OFFSET_X;
		out[1] = value + OFFSET_Y;
		out[2] = value + OFFSET_Z;
		sink += out[0];
	}

	return sink;
}

function intoFloat64_(): number {
	const out = new Float64Array(3);
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		out[0] = value + OFFSET_X;
		out[1] = value + OFFSET_Y;
		out[2] = value + OFFSET_Z;
		sink += out[0]!;
	}

	return sink;
}

/** One slot of a shared pool, which is what a batched form would hand out. */
function intoPooled_(): number {
	const pool = new Float64Array(CALLS * 3);
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const at = index * 3;
		pool[at] = value + OFFSET_X;
		pool[at + 1] = value + OFFSET_Y;
		pool[at + 2] = value + OFFSET_Z;
		sink += pool[at]!;
	}

	return sink;
}

/**
 * Assigned by every escaping case, so the values it built outlive the call.
 *
 * Without this V8 sees a value that never leaves its loop and stack-allocates
 * it, which is what makes a fresh tuple look free — real code returns the value
 * to a caller and gets no such help.
 */
// oxlint-disable-next-line no-unused-vars
let retained_: unknown;

function escapingTuples_(): number {
	const kept: [number, number, number][] = Array.from({ length: CALLS });
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out: [number, number, number] = [
			value + OFFSET_X,
			value + OFFSET_Y,
			value + OFFSET_Z,
		];
		kept[index] = out;
		sink += out[0];
	}

	retained_ = kept;
	return sink;
}

function escapingObjects_(): number {
	const kept: { x: number; y: number; z: number }[] = Array.from({
		length: CALLS,
	});
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out = {
			x: value + OFFSET_X,
			y: value + OFFSET_Y,
			z: value + OFFSET_Z,
		};
		kept[index] = out;
		sink += out.x;
	}

	retained_ = kept;
	return sink;
}

function escapingFloat64_(): number {
	const kept: Float64Array[] = Array.from({ length: CALLS });
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const out = new Float64Array(3);
		out[0] = value + OFFSET_X;
		out[1] = value + OFFSET_Y;
		out[2] = value + OFFSET_Z;
		kept[index] = out;
		sink += out[0]!;
	}

	retained_ = kept;
	return sink;
}

/** The batched form: one buffer for every value, no per-value object at all. */
function escapingPool_(): number {
	const kept = new Float64Array(CALLS * 3);
	let sink = 0;

	for (let index = 0; index < CALLS; index++) {
		const value = scalar_(index);
		const at = index * 3;
		kept[at] = value + OFFSET_X;
		kept[at + 1] = value + OFFSET_Y;
		kept[at + 2] = value + OFFSET_Z;
		sink += kept[at]!;
	}

	retained_ = kept;
	return sink;
}

function declareLayouts_(declare: (name: string, run: () => void) => void) {
	declare("[number, number, number] — fresh tuple per call", () => {
		assert.strictEqual(viaTuple_(), EXPECTED);
	});
	declare("{ x, y, z } — fresh object per call", () => {
		assert.strictEqual(viaObject_(), EXPECTED);
	});
	declare("new Float64Array(3) per call", () => {
		assert.strictEqual(viaFloat64_(), EXPECTED);
	});
	declare("new Float32Array(3) per call", () => {
		assert.strictEqual(viaFloat32_(), EXPECTED);
	});
	declare("into a caller-owned tuple", () => {
		assert.strictEqual(intoTuple_(), EXPECTED);
	});
	declare("into a caller-owned Float64Array(3)", () => {
		assert.strictEqual(intoFloat64_(), EXPECTED);
	});
	declare("into a pooled Float64Array slot", () => {
		assert.strictEqual(intoPooled_(), EXPECTED);
	});
}

function declareEscaping_(declare: (name: string, run: () => void) => void) {
	declare("[number, number, number][] — retained tuples", () => {
		assert.strictEqual(escapingTuples_(), EXPECTED);
	});
	declare("{ x, y, z }[] — retained objects", () => {
		assert.strictEqual(escapingObjects_(), EXPECTED);
	});
	declare("Float64Array(3)[] — retained typed arrays", () => {
		assert.strictEqual(escapingFloat64_(), EXPECTED);
	});
	declare("one Float64Array(n × 3) — batched form", () => {
		assert.strictEqual(escapingPool_(), EXPECTED);
	});
}

durationCondition(
	`vec3 build — ${CALLS.toLocaleString("en-US")} values per call`,
	() => {
		declareLayouts_((name, run) => {
			durationCase(name, { tags: { kind: "js" } }, run);
		});
	},
);

durationCondition(
	`vec3 build, values retained — ${CALLS.toLocaleString("en-US")} per call`,
	() => {
		declareEscaping_((name, run) => {
			durationCase(name, { tags: { kind: "js" } }, run);
		});
	},
);

resourceCondition(
	`vec3 build — ${CALLS.toLocaleString("en-US")} values per call`,
	() => {
		resourceCase(
			"empty case",
			{ tags: { kind: "js", role: "floor" } },
			() => {},
		);

		declareLayouts_((name, run) => {
			resourceCase(name, { tags: { kind: "js" } }, run);
		});
	},
);

resourceCondition(
	`vec3 build, values retained — ${CALLS.toLocaleString("en-US")} per call`,
	() => {
		resourceCase(
			"empty case",
			{ tags: { kind: "js", role: "floor" } },
			() => {},
		);

		declareEscaping_((name, run) => {
			resourceCase(name, { tags: { kind: "js" } }, run);
		});
	},
);
