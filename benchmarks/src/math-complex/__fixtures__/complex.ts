import assert from "node:assert";

/**
 * Sizes are powers of two because the FFT suite needs them, and the same values
 * feed both suites so a reader can line the two tables up. They straddle the
 * cache: 1 024 complex values are 16 KiB and sit in L1, 262 144 are 4 MiB and
 * do not, which is the whole question split storage is supposed to answer.
 */
export const SMALL = 1_024;
export const MEDIUM = 32_768;
export const LARGE = 262_144;

export const COMPLEX_SIZES = [SMALL, MEDIUM, LARGE] as const;

/**
 * Elements per case body. Deliberately small: precision is the sampler's job,
 * not the case body's. `relativeError: "auto"` keeps drawing samples until the
 * confidence interval is tight enough, and `subtractHarnessOverhead` removes
 * the per-sample cost of the harness itself — so a short body is measured
 * accurately without inflating the total element count into the billions.
 */
export const ELEMENT_BUDGET = 65_536;

/**
 * Bounds the total work. With `maxRuns` at 400 the whole suite stays under a
 * billion element-operations, where an uncapped run at these sizes would reach
 * tens of billions and tell us nothing extra.
 */
export const COMPLEX_SAMPLING = {
	warmup: 3,
	minRuns: 10,
	maxRuns: 400,
	minTimeMs: 200,
	maxTimeMs: 3_000,
	subtractHarnessOverhead: true,
} as const;

/**
 * Dyadic quarters in `[0, 1.75]`, mirrored exactly by `workload.py`. Every
 * product and sum of a complex multiply over these stays a small multiple of
 * 1/16, so the interleaved, split and tuple forms — and numpy's `complex128` —
 * must all produce the bit-identical checksum. A layout that is fast because it
 * lost precision fails the assertion instead of winning the table.
 */
export function componentAt(index: number, phase: number): number {
	return (((index + 1) * phase) % 8) / 4;
}

export const A_REAL_PHASE = 37;
export const A_IMAGINARY_PHASE = 53;
export const B_REAL_PHASE = 29;
export const B_IMAGINARY_PHASE = 41;

/** Interleaved `re, im, re, im, …` — the shape a `Complex[]` flattens to. */
export function interleaved(
	count: number,
	realPhase: number,
	imaginaryPhase: number,
): Float64Array {
	const values = new Float64Array(count * 2);
	for (let index = 0; index < count; index++) {
		values[index * 2] = componentAt(index, realPhase);
		values[index * 2 + 1] = componentAt(index, imaginaryPhase);
	}

	return values;
}

/** One plane per component — what `math-signal`'s planned `fft` asks for. */
export function planes(
	count: number,
	realPhase: number,
	imaginaryPhase: number,
): readonly [Float64Array, Float64Array] {
	const real = new Float64Array(count);
	const imaginary = new Float64Array(count);
	for (let index = 0; index < count; index++) {
		real[index] = componentAt(index, realPhase);
		imaginary[index] = componentAt(index, imaginaryPhase);
	}

	return [real, imaginary];
}

/** `math-complex`'s current public shape: one two-element tuple per value. */
export function tuples(
	count: number,
	realPhase: number,
	imaginaryPhase: number,
): [number, number][] {
	return Array.from(
		{ length: count },
		(_unused, index) =>
			[componentAt(index, realPhase), componentAt(index, imaginaryPhase)] as [
				number,
				number,
			],
	);
}

/**
 * Weights the imaginary sum differently from the real one, so a contender that
 * swaps the two components fails rather than matching. Exact on dyadic data at
 * every size here, which is what lets the comparison be `strictEqual`.
 */
export function productChecksum(
	count: number,
	at: (index: number) => readonly [number, number],
): number {
	let real = 0;
	let imaginary = 0;
	for (let index = 0; index < count; index++) {
		const [re, im] = at(index);
		real += re;
		imaginary += im;
	}

	return real + 3 * imaginary;
}

/** The reference product, computed the obvious way. */
export function expectedProductChecksum(count: number): number {
	let real = 0;
	let imaginary = 0;
	for (let index = 0; index < count; index++) {
		const ar = componentAt(index, A_REAL_PHASE);
		const ai = componentAt(index, A_IMAGINARY_PHASE);
		const br = componentAt(index, B_REAL_PHASE);
		const bi = componentAt(index, B_IMAGINARY_PHASE);
		real += ar * br - ai * bi;
		imaginary += ar * bi + ai * br;
	}

	return real + 3 * imaginary;
}

/** Holds the work per case body roughly constant across sizes. */
export function repeatsFor(count: number): number {
	return Math.max(1, Math.round(ELEMENT_BUDGET / count));
}

export function assertCloseTo(
	actual: number,
	wanted: number,
	digits: number,
): void {
	assert.strictEqual(actual.toPrecision(digits), wanted.toPrecision(digits));
}
