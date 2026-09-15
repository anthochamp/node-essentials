import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { setUint32ArrayLe } from "@ac-kit/core";
import {
	IEEE_BINARY_FALLBACK_KERNEL,
	IEEE_FORMAT_BINARY64,
	IeeeBinary,
	ieeeBinaryFromNumber,
	ieeeBinaryMulBatch,
	IeeeBinaryPackedArray,
	installIeeeBinaryKernel,
} from "@ac-kit/math-numbers";
import { xorshift32 } from "@ac-kit/math-random";

/**
 * What the packed batch API costs over calling the scalar op directly.
 *
 * What is left of the WASM kernel's deficit is the fixed cost of crossing into
 * WASM once per scalar operation — a cost that cannot be compiled away, only
 * amortised over a batch. Before a native batch is worth writing, the batch
 * _interface_ has to be cheap enough that what amortising the crossing saves is
 * not immediately spent on packing instead; that gap is what this measures, and
 * it is the bar a native `mulBatch` has to clear.
 *
 * There is deliberately no "WASM kernel" row: the compiled module exposes no
 * batched entry point yet, so installing it leaves the portable batch in place
 * and the row would measure the same function twice. Add it in the same change
 * that adds `sf_mul_batch`.
 */

const FORMAT = IEEE_FORMAT_BINARY64;
const ELEMENT_BYTES = FORMAT.k >>> 3;
const COUNTS: readonly number[] = [1, 10, 100, 1_000, 10_000, 100_000];

/** Deterministic operands spread over several binades. */
function operandValues(count: number, seed: number): number[] {
	const rand = xorshift32(seed);

	return Array.from({ length: count }, () => {
		const scale = 2 ** Math.trunc(rand() * 20 - 10);

		return (rand() * 2 - 1) * scale;
	});
}

function packAll(values: readonly number[]): IeeeBinaryPackedArray {
	const bytes = new Uint8Array(
		values.length * ELEMENT_BYTES,
	) as IeeeBinaryPackedArray;

	values.forEach((value, index) => {
		const words = new Uint32Array(2);

		new DataView(words.buffer).setFloat64(0, value, /* littleEndian */ true);
		setUint32ArrayLe(bytes, index * ELEMENT_BYTES, words, ELEMENT_BYTES);
	});

	return bytes;
}

let sink = 0;

installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL);

for (const count of COUNTS) {
	const leftValues = operandValues(count, 0x2545f491);
	const rightValues = operandValues(count, 0x9e3779b9);

	const leftPacked = packAll(leftValues);
	const rightPacked = packAll(rightValues);
	const outPacked = new Uint8Array(
		count * ELEMENT_BYTES,
	) as IeeeBinaryPackedArray;

	const leftUnpacked = leftValues.map((value) =>
		ieeeBinaryFromNumber(value, FORMAT),
	);
	const rightUnpacked = rightValues.map((value) =>
		ieeeBinaryFromNumber(value, FORMAT),
	);
	const outUnpacked: IeeeBinary[] = Array.from(
		{ length: count },
		() => leftUnpacked[0]!,
	);

	durationCondition(
		`Soft float batch — binary64 mul, ${count.toLocaleString("en-US")} elements`,
		() => {
			durationCase(
				"hardware `a × b`",
				{ tags: { kind: "native", layer: "fpu" } },
				() => {
					let total = 0;

					for (let index = 0; index < count; index++) {
						total += leftValues[index]! * rightValues[index]!;
					}

					sink += total === 0 ? 1 : 0;
				},
			);

			durationCase(
				"scalar loop over unpacked values",
				{ tags: { kind: "js", layer: "scalar loop" } },
				() => {
					for (let index = 0; index < count; index++) {
						outUnpacked[index] = IEEE_BINARY_FALLBACK_KERNEL.mul(
							leftUnpacked[index]!,
							rightUnpacked[index]!,
							FORMAT,
						);
					}

					sink += outUnpacked[0]!.kind === "finite" ? 1 : 0;
				},
			);

			durationCase(
				"mulBatch over packed buffers",
				{ tags: { kind: "js", layer: "batch" } },
				() => {
					ieeeBinaryMulBatch(leftPacked, rightPacked, outPacked, count, FORMAT);

					sink += outPacked[0]!;
				},
			);
		},
	);
}

export { sink };
