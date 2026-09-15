import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import { type Complex, complexMul } from "@ac-kit/math-complex";

import {
	A_IMAGINARY_PHASE,
	A_REAL_PHASE,
	B_IMAGINARY_PHASE,
	B_REAL_PHASE,
	COMPLEX_SAMPLING,
	COMPLEX_SIZES,
	expectedProductChecksum,
	interleaved,
	MEDIUM,
	planes,
	repeatsFor,
	tuples,
} from "./__fixtures__/complex.js";

/**
 * One operation — the element-wise product of two arrays of complex numbers —
 * read from every storage `math-complex` could offer. A packed `ComplexArray`
 * has to be benchmarked against the interleaved tuple form before either is
 * committed to.
 *
 * Numpy is not here. At this size a subprocess spends more time starting than
 * computing, which makes the comparison meaningless — it lives in
 * `complex-multiply-cross-language.bench.ts` at a size where compute
 * dominates.
 */

function registerContenders_(
	count: number,
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const repeats = repeatsFor(count);
	const wanted = expectedProductChecksum(count);

	{
		const a = tuples(count, A_REAL_PHASE, A_IMAGINARY_PHASE) as Complex[];
		const b = tuples(count, B_REAL_PHASE, B_IMAGINARY_PHASE) as Complex[];
		const out: Complex[] = Array.from({ length: count }, () => [0, 0]);
		register(
			"Complex[] — complexMul, fresh tuple per element",
			{ storage: "tuple", allocates: "per element" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < count; index++) {
						out[index] = complexMul(a[index]!, b[index]!);
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < count; index++) {
					real += out[index]![0];
					imaginary += out[index]![1];
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);
	}

	{
		const a = tuples(count, A_REAL_PHASE, A_IMAGINARY_PHASE);
		const b = tuples(count, B_REAL_PHASE, B_IMAGINARY_PHASE);
		const out = Array.from({ length: count }, () => [0, 0] as [number, number]);
		// The `complexMulInto(out, a, b)` this package plans, inlined so the
		// measurement is of the shape rather than of one particular export.
		register(
			"Complex[] — into a caller-owned tuple",
			{ storage: "tuple", allocates: "never" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < count; index++) {
						const left = a[index]!;
						const right = b[index]!;
						const target = out[index]!;
						target[0] = left[0] * right[0] - left[1] * right[1];
						target[1] = left[0] * right[1] + left[1] * right[0];
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < count; index++) {
					real += out[index]![0];
					imaginary += out[index]![1];
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);
	}

	{
		const a = interleaved(count, A_REAL_PHASE, A_IMAGINARY_PHASE);
		const b = interleaved(count, B_REAL_PHASE, B_IMAGINARY_PHASE);
		const out = new Float64Array(count * 2);
		register(
			"interleaved Float64Array (stride 2)",
			{ storage: "f64 interleaved", allocates: "never" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < count; index++) {
						const at = index * 2;
						const ar = a[at]!;
						const ai = a[at + 1]!;
						const br = b[at]!;
						const bi = b[at + 1]!;
						out[at] = ar * br - ai * bi;
						out[at + 1] = ar * bi + ai * br;
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < count; index++) {
					real += out[index * 2]!;
					imaginary += out[index * 2 + 1]!;
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);
	}

	{
		const [aReal, aImaginary] = planes(count, A_REAL_PHASE, A_IMAGINARY_PHASE);
		const [bReal, bImaginary] = planes(count, B_REAL_PHASE, B_IMAGINARY_PHASE);
		const outReal = new Float64Array(count);
		const outImaginary = new Float64Array(count);
		register(
			"split Float64Array planes",
			{ storage: "f64 split", allocates: "never" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < count; index++) {
						const ar = aReal[index]!;
						const ai = aImaginary[index]!;
						const br = bReal[index]!;
						const bi = bImaginary[index]!;
						outReal[index] = ar * br - ai * bi;
						outImaginary[index] = ar * bi + ai * br;
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < count; index++) {
					real += outReal[index]!;
					imaginary += outImaginary[index]!;
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);
	}

	{
		const a = Array.from(interleaved(count, A_REAL_PHASE, A_IMAGINARY_PHASE));
		const b = Array.from(interleaved(count, B_REAL_PHASE, B_IMAGINARY_PHASE));
		const out = Array.from({ length: count * 2 }, () => 0);
		register(
			"interleaved number[] (stride 2)",
			{ storage: "array interleaved", allocates: "never" },
			() => {
				for (let pass = 0; pass < repeats; pass++) {
					for (let index = 0; index < count; index++) {
						const at = index * 2;
						const ar = a[at]!;
						const ai = a[at + 1]!;
						const br = b[at]!;
						const bi = b[at + 1]!;
						out[at] = ar * br - ai * bi;
						out[at + 1] = ar * bi + ai * br;
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < count; index++) {
					real += out[index * 2]!;
					imaginary += out[index * 2 + 1]!;
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);
	}
}

for (const count of COMPLEX_SIZES) {
	const repeats = repeatsFor(count);
	durationCondition(
		`Complex multiply — ${count.toLocaleString("en-US")} values × ${repeats}`,
		{ sampling: COMPLEX_SAMPLING },
		() => {
			registerContenders_(count, (name, tags, run) =>
				durationCase(name, { tags }, run),
			);
		},
	);
}

/** Allocation at one size only — the measure forks a child process per case. */
resourceCondition(
	`Complex multiply — ${MEDIUM.toLocaleString("en-US")} values — allocation`,
	() => {
		registerContenders_(MEDIUM, (name, tags, run) =>
			resourceCase(name, { tags }, run),
		);
	},
);
