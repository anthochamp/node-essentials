import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";

/**
 * One operation — a weighted sum over a numeric buffer — reached through
 * progressively more generic machinery, to price the "one API over any
 * precision" idea from the outside in.
 *
 * A per-element dispatcher is already ruled out; the kind has to be resolved
 * once. This measures what each way of doing that actually costs, including the
 * two things that make it hard: V8 stops specialising a call site once several
 * element types flow through it, and an interface-typed operation cannot be
 * inlined at all.
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

function fill<T extends { [index: number]: number; length: number }>(
	target: T,
): T {
	for (let index = 0; index < target.length; index++) {
		target[index] = ((index * 37) % 256) / 4;
	}

	return target;
}

const f64 = fill(new Float64Array(COUNT));
const f32 = fill(new Float32Array(COUNT));
const i32 = fill(new Int32Array(COUNT));
const u32 = fill(new Uint32Array(COUNT));
const i16 = fill(new Int16Array(COUNT));
const u8 = fill(new Uint8Array(COUNT));

const WANTED = (() => {
	let total = 0;
	for (let index = 0; index < COUNT; index++) {
		total += f64[index]!;
	}

	return total;
})();

/** Monomorphic: only ever sees `Float64Array`. The ceiling. */
function sumFloat64_(values: Float64Array): number {
	let total = 0;
	for (let index = 0; index < values.length; index++) {
		total += values[index]!;
	}

	return total;
}

/**
 * The same body, but the parameter is a union, so one call site sees six
 * element kinds. This is what a single generic entry point compiles to.
 */
type AnyNumericArray =
	| Float64Array
	| Float32Array
	| Int32Array
	| Uint32Array
	| Int16Array
	| Uint8Array;

function sumPolymorphic_(values: AnyNumericArray): number {
	let total = 0;
	for (let index = 0; index < values.length; index++) {
		total += values[index]!;
	}

	return total;
}

/** Kind resolved once, at construction, into a closure over a concrete type. */
function createFloat64Summer(values: Float64Array): () => number {
	return () => {
		let total = 0;
		for (let index = 0; index < values.length; index++) {
			total += values[index]!;
		}

		return total;
	};
}

/**
 * The evidence-style shape: the operation arrives as an interface.
 *
 * Written out twice because a call site has one inline cache. Sharing a single
 * function between the one-implementation and four-implementation cases would
 * let the second poison the first, and both would report the megamorphic number
 * — which is exactly what happened before these were split.
 */
type Reader = { readonly at: (index: number) => number; readonly size: number };

function sumThroughOneReader_(reader: Reader): number {
	let total = 0;
	for (let index = 0; index < reader.size; index++) {
		total += reader.at(index);
	}

	return total;
}

function sumThroughManyReaders_(reader: Reader): number {
	let total = 0;
	for (let index = 0; index < reader.size; index++) {
		total += reader.at(index);
	}

	return total;
}

durationCondition(
	`Weighted sum over ${COUNT.toLocaleString("en-US")} values — dispatch cost`,
	{ sampling: SAMPLING },
	() => {
		durationCase(
			"monomorphic Float64Array",
			{ tags: { dispatch: "none" } },
			() => {
				assert.strictEqual(sumFloat64_(f64), WANTED);
			},
		);

		const summer = createFloat64Summer(f64);
		durationCase(
			"closure specialised at construction",
			{ tags: { dispatch: "once" } },
			() => {
				assert.strictEqual(summer(), WANTED);
			},
		);

		// Warm the shared call site with every kind before measuring, so what is
		// timed is the steady state a generic API would actually run in.
		for (const values of [f64, f32, i32, u32, i16, u8]) {
			sumPolymorphic_(values);
		}
		durationCase(
			"one call site, 6 element kinds seen",
			{ tags: { dispatch: "megamorphic" } },
			() => {
				assert.strictEqual(sumPolymorphic_(f64), WANTED);
			},
		);

		const reader: Reader = { at: (index) => f64[index]!, size: COUNT };
		durationCase(
			"through a Reader interface, 1 implementation",
			{ tags: { dispatch: "interface-mono" } },
			() => {
				assert.strictEqual(sumThroughOneReader_(reader), WANTED);
			},
		);

		// The single-implementation case above is inlined away, which is only the
		// truth for a codebase with exactly one reader. This call site is warmed
		// with several, which is the shape an evidence-based generic API runs in.
		const readers: Reader[] = [
			{ at: (index) => f64[index]!, size: COUNT },
			{ at: (index) => f32[index]!, size: COUNT },
			{ at: (index) => i32[index]!, size: COUNT },
			{ at: (index) => u8[index]!, size: COUNT },
		];
		for (const candidate of readers) {
			sumThroughManyReaders_(candidate);
		}
		durationCase(
			"through a Reader interface, 4 implementations seen",
			{ tags: { dispatch: "interface-poly" } },
			() => {
				assert.strictEqual(sumThroughManyReaders_(readers[0]!), WANTED);
			},
		);
	},
);
