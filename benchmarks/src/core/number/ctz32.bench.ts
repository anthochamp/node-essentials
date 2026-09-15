import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { ctz32, popCount32 } from "@ac-kit/core";

/**
 * Count-trailing-zeros over 32 bits, three ways.
 *
 * `@ac-kit/core` derives it from `popcount32`, while `@ac-kit/data`'s `BitSet`
 * and `BitVector` inline `31 - Math.clz32(word & -word)` instead — one
 * intrinsic against a call plus a population count. Before those call sites are
 * folded onto the shared helper, the shared helper has to be the faster one.
 *
 * The bare `clz32` idiom returns -1 at zero where `ctz32(0)` is 32, so the
 * guarded form is what a drop-in replacement would actually cost.
 */

const COUNT = 262_144;

const SAMPLING = {
	warmup: 5,
	minRuns: 10,
	maxRuns: 120,
	minTimeMs: 200,
	maxTimeMs: 4_000,
	subtractHarnessOverhead: true,
} as const;

/** Current `@ac-kit/core` implementation, inlined so the contenders match. */
function ctzViaPopcount_(value: number): number {
	const x = value >>> 0;

	return popCount32(((x & -x) - 1) >>> 0);
}

function ctzViaClz_(value: number): number {
	const x = value >>> 0;

	return x === 0 ? 32 : 31 - Math.clz32(x & -x);
}

// The classic de Bruijn sequence for 32-bit CTZ: multiplying the isolated
// lowest set bit by it puts a unique 5-bit index in the top five bits.
const DE_BRUIJN_SEQUENCE = 0x077cb531;
const DE_BRUIJN_INDEX = new Uint8Array([
	0, 1, 28, 2, 29, 14, 24, 3, 30, 22, 20, 15, 25, 17, 4, 8, 31, 27, 13, 23, 21,
	19, 16, 7, 26, 12, 18, 6, 11, 5, 10, 9,
]);

function ctzViaDeBruijn_(value: number): number {
	const x = value >>> 0;
	if (x === 0) {
		return 32;
	}

	return DE_BRUIJN_INDEX[(Math.imul(x & -x, DE_BRUIJN_SEQUENCE) >>> 27) & 31]!;
}

/**
 * Words as a bitset actually holds them: mostly non-zero and sparsely
 * populated, with zeros present so the guard is exercised rather than predicted
 * away.
 */
const words = new Uint32Array(COUNT);
for (let index = 0; index < COUNT; index++) {
	words[index] = index % 17 === 0 ? 0 : ((index * 2_654_435_761) >>> 0) & -1;
}

function totalOver(ctz: (value: number) => number): number {
	let total = 0;
	for (let index = 0; index < COUNT; index++) {
		total += ctz(words[index]!);
	}

	return total;
}

const WANTED = totalOver(ctzViaPopcount_);

assert.strictEqual(totalOver(ctzViaClz_), WANTED);
assert.strictEqual(totalOver(ctzViaDeBruijn_), WANTED);
assert.strictEqual(totalOver(ctz32), WANTED);

durationCondition(
	`ctz32 over ${COUNT.toLocaleString("en-US")} words`,
	{ sampling: SAMPLING },
	() => {
		durationCase("@ac-kit/core ctz32 (exported)", () => {
			assert.strictEqual(totalOver(ctz32), WANTED);
		});
		durationCase("popcount32 of the low mask", () => {
			assert.strictEqual(totalOver(ctzViaPopcount_), WANTED);
		});
		durationCase("Math.clz32 of the isolated bit, zero-guarded", () => {
			assert.strictEqual(totalOver(ctzViaClz_), WANTED);
		});
		durationCase("de Bruijn multiply and table lookup", () => {
			assert.strictEqual(totalOver(ctzViaDeBruijn_), WANTED);
		});
	},
);
