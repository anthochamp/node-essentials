import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import { type Complex, complexMul } from "@ac-kit/math-complex";

import {
	A_IMAGINARY_PHASE,
	A_REAL_PHASE,
	componentAt,
	MEDIUM,
	SMALL,
} from "./__fixtures__/complex.js";

/**
 * One operation — a radix-2 Cooley–Tukey FFT — across the three storages an
 * `fft` could use. The claim under test is that splitting real and imaginary
 * planes into separate `Float64Array`s beats interleaving them, because the
 * inner butterfly touches both and split storage keeps each stride contiguous.
 *
 * The element-wise multiply suite cannot settle that claim, because it reads
 * every element exactly once in order. Only a butterfly, whose stride doubles
 * each stage, can — which is why this is a separate suite rather than another
 * condition there.
 *
 * Each implementation is verified against Parseval's theorem rather than
 * against one of the others, so all three can be wrong in the same way and
 * still fail.
 */

/**
 * Trades sample count against size so the whole file stays under ~600M
 * butterflies.
 */
const PLAN = [
	{ size: SMALL, repeats: 49, maxRuns: 200 },
	{ size: MEDIUM, repeats: 1, maxRuns: 200 },
	{ size: 262_144, repeats: 1, maxRuns: 30 },
] as const;

function bitReversalTable_(size: number): Uint32Array {
	const bits = Math.log2(size);
	const table = new Uint32Array(size);
	for (let index = 0; index < size; index++) {
		let reversed = 0;
		for (let bit = 0; bit < bits; bit++) {
			reversed = (reversed << 1) | ((index >>> bit) & 1);
		}
		table[index] = reversed;
	}

	return table;
}

/** Twiddles for every stage, laid out so a stage reads a contiguous run. */
function twiddleTable_(size: number): readonly [Float64Array, Float64Array] {
	const real = new Float64Array(size / 2);
	const imaginary = new Float64Array(size / 2);
	for (let index = 0; index < size / 2; index++) {
		const angle = (-2 * Math.PI * index) / size;
		real[index] = Math.cos(angle);
		imaginary[index] = Math.sin(angle);
	}

	return [real, imaginary];
}

function fftInterleaved_(
	values: Float64Array,
	size: number,
	reversal: Uint32Array,
	twiddleReal: Float64Array,
	twiddleImaginary: Float64Array,
): void {
	for (let index = 0; index < size; index++) {
		const target = reversal[index]!;
		if (target > index) {
			const a = index * 2;
			const b = target * 2;
			const re = values[a]!;
			const im = values[a + 1]!;
			values[a] = values[b]!;
			values[a + 1] = values[b + 1]!;
			values[b] = re;
			values[b + 1] = im;
		}
	}

	for (let span = 1; span < size; span *= 2) {
		const step = size / (span * 2);
		for (let start = 0; start < size; start += span * 2) {
			for (let offset = 0; offset < span; offset++) {
				const even = (start + offset) * 2;
				const odd = (start + offset + span) * 2;
				const twiddle = offset * step;
				const wr = twiddleReal[twiddle]!;
				const wi = twiddleImaginary[twiddle]!;
				const or_ = values[odd]!;
				const oi = values[odd + 1]!;
				const tr = or_ * wr - oi * wi;
				const ti = or_ * wi + oi * wr;
				const er = values[even]!;
				const ei = values[even + 1]!;
				values[even] = er + tr;
				values[even + 1] = ei + ti;
				values[odd] = er - tr;
				values[odd + 1] = ei - ti;
			}
		}
	}
}

function fftSplit_(
	real: Float64Array,
	imaginary: Float64Array,
	size: number,
	reversal: Uint32Array,
	twiddleReal: Float64Array,
	twiddleImaginary: Float64Array,
): void {
	for (let index = 0; index < size; index++) {
		const target = reversal[index]!;
		if (target > index) {
			const re = real[index]!;
			const im = imaginary[index]!;
			real[index] = real[target]!;
			imaginary[index] = imaginary[target]!;
			real[target] = re;
			imaginary[target] = im;
		}
	}

	for (let span = 1; span < size; span *= 2) {
		const step = size / (span * 2);
		for (let start = 0; start < size; start += span * 2) {
			for (let offset = 0; offset < span; offset++) {
				const even = start + offset;
				const odd = even + span;
				const twiddle = offset * step;
				const wr = twiddleReal[twiddle]!;
				const wi = twiddleImaginary[twiddle]!;
				const or_ = real[odd]!;
				const oi = imaginary[odd]!;
				const tr = or_ * wr - oi * wi;
				const ti = or_ * wi + oi * wr;
				const er = real[even]!;
				const ei = imaginary[even]!;
				real[even] = er + tr;
				imaginary[even] = ei + ti;
				real[odd] = er - tr;
				imaginary[odd] = ei - ti;
			}
		}
	}
}

/** The same algorithm through `math-complex`'s current public surface. */
function fftTuples_(
	values: Complex[],
	size: number,
	reversal: Uint32Array,
	twiddles: Complex[],
): void {
	for (let index = 0; index < size; index++) {
		const target = reversal[index]!;
		if (target > index) {
			const held = values[index]!;
			values[index] = values[target]!;
			values[target] = held;
		}
	}

	for (let span = 1; span < size; span *= 2) {
		const step = size / (span * 2);
		for (let start = 0; start < size; start += span * 2) {
			for (let offset = 0; offset < span; offset++) {
				const even = start + offset;
				const odd = even + span;
				const product = complexMul(values[odd]!, twiddles[offset * step]!);
				const held = values[even]!;
				values[even] = [held[0] + product[0], held[1] + product[1]];
				values[odd] = [held[0] - product[0], held[1] - product[1]];
			}
		}
	}
}

/**
 * Parseval's theorem: the energy of the transform is `size` times the energy of
 * the signal. An independent identity, so an implementation cannot pass by
 * agreeing with a sibling that is wrong in the same way.
 *
 * Takes two scalar accessors rather than one returning a pair, so verifying
 * does not allocate a tuple per element and land in the allocation table.
 */
function assertParseval_(
	size: number,
	signalEnergy: number,
	realAt: (index: number) => number,
	imaginaryAt: (index: number) => number,
): void {
	let energy = 0;
	for (let index = 0; index < size; index++) {
		const re = realAt(index);
		const im = imaginaryAt(index);
		energy += re * re + im * im;
	}
	const wanted = signalEnergy * size;
	assert.ok(
		Math.abs(energy - wanted) <= 1e-9 * wanted,
		`Parseval: ${energy} vs ${wanted}`,
	);
}

function signalEnergy_(size: number): number {
	let energy = 0;
	for (let index = 0; index < size; index++) {
		const re = componentAt(index, A_REAL_PHASE);
		const im = componentAt(index, A_IMAGINARY_PHASE);
		energy += re * re + im * im;
	}

	return energy;
}

function registerContenders_(
	size: number,
	repeats: number,
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const reversal = bitReversalTable_(size);
	const [twiddleReal, twiddleImaginary] = twiddleTable_(size);
	const energy = signalEnergy_(size);

	{
		const source = new Float64Array(size * 2);
		for (let index = 0; index < size; index++) {
			source[index * 2] = componentAt(index, A_REAL_PHASE);
			source[index * 2 + 1] = componentAt(index, A_IMAGINARY_PHASE);
		}
		const scratch = new Float64Array(size * 2);
		register(
			"interleaved Float64Array (stride 2)",
			{ storage: "f64 interleaved" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					scratch.set(source);
					fftInterleaved_(
						scratch,
						size,
						reversal,
						twiddleReal,
						twiddleImaginary,
					);
				}
				assertParseval_(
					size,
					energy,
					(index) => scratch[index * 2]!,
					(index) => scratch[index * 2 + 1]!,
				);
			},
		);
	}

	{
		const sourceReal = new Float64Array(size);
		const sourceImaginary = new Float64Array(size);
		for (let index = 0; index < size; index++) {
			sourceReal[index] = componentAt(index, A_REAL_PHASE);
			sourceImaginary[index] = componentAt(index, A_IMAGINARY_PHASE);
		}
		const real = new Float64Array(size);
		const imaginary = new Float64Array(size);
		register("split Float64Array planes", { storage: "f64 split" }, () => {
			for (let pass = 0; pass < repeats; pass++) {
				real.set(sourceReal);
				imaginary.set(sourceImaginary);
				fftSplit_(
					real,
					imaginary,
					size,
					reversal,
					twiddleReal,
					twiddleImaginary,
				);
			}
			assertParseval_(
				size,
				energy,
				(index) => real[index]!,
				(index) => imaginary[index]!,
			);
		});
	}

	{
		const twiddles: Complex[] = Array.from(
			{ length: size / 2 },
			(_unused, index) =>
				[twiddleReal[index]!, twiddleImaginary[index]!] as Complex,
		);
		// Allocated once and refilled component-wise, so the only allocation this
		// contender is charged for is the one its own butterfly performs.
		const values: Complex[] = Array.from(
			{ length: size },
			() => [0, 0] as Complex,
		);
		register(
			"Complex[] — complexMul, fresh tuple per butterfly",
			{ storage: "tuple" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < size; index++) {
						const slot = values[index]!;
						slot[0] = componentAt(index, A_REAL_PHASE);
						slot[1] = componentAt(index, A_IMAGINARY_PHASE);
					}
					fftTuples_(values, size, reversal, twiddles);
				}
				assertParseval_(
					size,
					energy,
					(index) => values[index]![0],
					(index) => values[index]![1],
				);
			},
		);
	}
}

for (const { size, repeats, maxRuns } of PLAN) {
	durationCondition(
		`FFT — ${size.toLocaleString("en-US")} points × ${repeats}`,
		{
			sampling: {
				warmup: 3,
				minRuns: 10,
				maxRuns,
				minTimeMs: 200,
				maxTimeMs: 4_000,
				subtractHarnessOverhead: true,
			},
		},
		() => {
			registerContenders_(size, repeats, (name, tags, run) =>
				durationCase(name, { tags }, run),
			);
		},
	);
}

resourceCondition(
	`FFT — ${MEDIUM.toLocaleString("en-US")} points — allocation`,
	() => {
		registerContenders_(MEDIUM, 1, (name, tags, run) =>
			resourceCase(name, { tags }, run),
		);
	},
);
