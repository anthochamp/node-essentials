import assert from "assert";

import { randomFloat64Values, randomUint32Values } from "@ac-bench/util";

export const NUMBERS_SAMPLE_SIZE = 50_000;

/** Small enough that an `O(n²)` contender still finishes. */
export const NUMBERS_QUADRATIC_SAMPLE_SIZE = 10_000;

/** Half the values repeat, so deduplication has something to do. */
export const INTEGERS = randomUint32Values(NUMBERS_SAMPLE_SIZE).map(
	(value) => value % (NUMBERS_SAMPLE_SIZE / 2),
);
export const UNIQUE_INTEGERS = new Set(INTEGERS).size;

export const QUADRATIC_INTEGERS = INTEGERS.slice(
	0,
	NUMBERS_QUADRATIC_SAMPLE_SIZE,
);
export const QUADRATIC_UNIQUE_INTEGERS = new Set(QUADRATIC_INTEGERS).size;

/** Strictly positive: geometric and harmonic means are undefined at zero. */
export const POSITIVE_VALUES = randomFloat64Values(NUMBERS_SAMPLE_SIZE).map(
	(value) => value + 0.001,
);

export const SORTED_POSITIVE_VALUES = POSITIVE_VALUES.slice().sort(
	(a, b) => a - b,
);

/** Compares to 12 significant digits, which is where these algorithms diverge. */
export function closeTo(actual: number, wanted: number): void {
	assert.strictEqual(actual.toPrecision(12), wanted.toPrecision(12));
}
