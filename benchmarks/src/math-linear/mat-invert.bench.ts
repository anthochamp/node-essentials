import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clamp } from "@ac-kit/core";
import { mat2x2Invert, mat3x3Invert, mat4x4Invert } from "@ac-kit/math-linear";
import {
	Matrix3 as MathGlMatrix3,
	Matrix4 as MathGlMatrix4,
} from "@math.gl/core";
import { mat2, mat3, mat4 } from "gl-matrix";
import { inv as mathjsInv } from "mathjs";
import { inverse as mlInverse, Matrix as MlMatrix } from "ml-matrix";
import { Matrix3 as ThreeMatrix3, Matrix4 as ThreeMatrix4 } from "three";
import { mat3 as wgpuMat3, mat4 as wgpuMat4 } from "wgpu-matrix";

import {
	assertClose,
	checksum,
	float32Tolerance,
	float64Tolerance,
	packedArray,
	SIZES_FIXED,
	SIZES_LARGE,
	toColumnMajor,
	toNested,
	toWgpuMat3,
	wellConditionedMatrix,
} from "./__fixtures__/matrices.js";

/**
 * One operation — inversion — the branchiest of the set. The fixed-size
 * libraries expand cofactors straight-line with no data-dependent control flow;
 * anything general runs a pivoted elimination whose branches depend on the
 * values. Operands are diagonally dominant so the pivot search never swaps and
 * every contender follows the same path.
 *
 * Inversion divides, so cofactor expansion and elimination legitimately
 * disagree in the last bits and results are compared with a tolerance.
 */

const SEED = 8;

function repeatsFor_(size: number): number {
	return clamp(Math.round(2_000_000 / size ** 3), 1, 2_000);
}

/*
 * Gauss-Jordan with partial pivoting, one kernel per element type. `scratch` is
 * caller-owned: elimination destroys its input, and a real implementation would
 * not allocate a working copy per call.
 */

function invertPlain_(
	source: number[],
	scratch: number[],
	out: number[],
	size: number,
): void {
	for (let index = 0; index < scratch.length; index++) {
		scratch[index] = source[index]!;
		out[index] = 0;
	}
	for (let k = 0; k < size; k++) {
		out[k * size + k] = 1;
	}
	for (let k = 0; k < size; k++) {
		let pivotRow = k;
		let best = Math.abs(scratch[k * size + k]!);
		for (let row = k + 1; row < size; row++) {
			const candidate = Math.abs(scratch[row * size + k]!);
			if (candidate > best) {
				best = candidate;
				pivotRow = row;
			}
		}
		if (pivotRow !== k) {
			for (let col = 0; col < size; col++) {
				const swapA = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swapA;
				const swapB = out[k * size + col]!;
				out[k * size + col] = out[pivotRow * size + col]!;
				out[pivotRow * size + col] = swapB;
			}
		}
		const inverse = 1 / scratch[k * size + k]!;
		for (let col = 0; col < size; col++) {
			scratch[k * size + col]! *= inverse;
			out[k * size + col]! *= inverse;
		}
		for (let row = 0; row < size; row++) {
			if (row === k) {
				continue;
			}
			const factor = scratch[row * size + k]!;
			if (factor === 0) {
				continue;
			}
			for (let col = 0; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
				out[row * size + col]! -= factor * out[k * size + col]!;
			}
		}
	}
}

function invertFloat64_(
	source: Float64Array,
	scratch: Float64Array,
	out: Float64Array,
	size: number,
): void {
	scratch.set(source);
	out.fill(0);
	for (let k = 0; k < size; k++) {
		out[k * size + k] = 1;
	}
	for (let k = 0; k < size; k++) {
		let pivotRow = k;
		let best = Math.abs(scratch[k * size + k]!);
		for (let row = k + 1; row < size; row++) {
			const candidate = Math.abs(scratch[row * size + k]!);
			if (candidate > best) {
				best = candidate;
				pivotRow = row;
			}
		}
		if (pivotRow !== k) {
			for (let col = 0; col < size; col++) {
				const swapA = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swapA;
				const swapB = out[k * size + col]!;
				out[k * size + col] = out[pivotRow * size + col]!;
				out[pivotRow * size + col] = swapB;
			}
		}
		const inverse = 1 / scratch[k * size + k]!;
		for (let col = 0; col < size; col++) {
			scratch[k * size + col]! *= inverse;
			out[k * size + col]! *= inverse;
		}
		for (let row = 0; row < size; row++) {
			if (row === k) {
				continue;
			}
			const factor = scratch[row * size + k]!;
			if (factor === 0) {
				continue;
			}
			for (let col = 0; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
				out[row * size + col]! -= factor * out[k * size + col]!;
			}
		}
	}
}

function invertFloat32_(
	source: Float32Array,
	scratch: Float32Array,
	out: Float32Array,
	size: number,
): void {
	scratch.set(source);
	out.fill(0);
	for (let k = 0; k < size; k++) {
		out[k * size + k] = 1;
	}
	for (let k = 0; k < size; k++) {
		let pivotRow = k;
		let best = Math.abs(scratch[k * size + k]!);
		for (let row = k + 1; row < size; row++) {
			const candidate = Math.abs(scratch[row * size + k]!);
			if (candidate > best) {
				best = candidate;
				pivotRow = row;
			}
		}
		if (pivotRow !== k) {
			for (let col = 0; col < size; col++) {
				const swapA = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swapA;
				const swapB = out[k * size + col]!;
				out[k * size + col] = out[pivotRow * size + col]!;
				out[pivotRow * size + col] = swapB;
			}
		}
		const inverse = 1 / scratch[k * size + k]!;
		for (let col = 0; col < size; col++) {
			scratch[k * size + col]! *= inverse;
			out[k * size + col]! *= inverse;
		}
		for (let row = 0; row < size; row++) {
			if (row === k) {
				continue;
			}
			const factor = scratch[row * size + k]!;
			if (factor === 0) {
				continue;
			}
			for (let col = 0; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
				out[row * size + col]! -= factor * out[k * size + col]!;
			}
		}
	}
}

/** The `Float64Array` elimination is the reference every contender is held to. */
function expectedChecksum_(size: number): number {
	const source = Float64Array.from(wellConditionedMatrix(size, SEED));
	const out = new Float64Array(size * size);
	invertFloat64_(source, new Float64Array(size * size), out, size);

	return checksum(size, (row, col) => out[row * size + col]!);
}

function registerFlatContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = wellConditionedMatrix(size, SEED);
	const relTol = float64Tolerance(size);

	{
		const source = logical.slice();
		const scratch = packedArray(size * size);
		const out = packedArray(size * size);
		durationCase(
			"flat number[] (Gauss-Jordan)",
			{ tags: { storage: "array" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					invertPlain_(source, scratch, out, size);
				}
				assertClose(
					checksum(size, (row, col) => out[row * size + col]!),
					wanted,
					relTol,
				);
			},
		);
	}

	{
		const source = Float64Array.from(logical);
		const scratch = new Float64Array(size * size);
		const out = new Float64Array(size * size);
		durationCase(
			"Float64Array (Gauss-Jordan)",
			{ tags: { storage: "f64" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					invertFloat64_(source, scratch, out, size);
				}
				assertClose(
					checksum(size, (row, col) => out[row * size + col]!),
					wanted,
					relTol,
				);
			},
		);
	}

	{
		const source = Float32Array.from(logical);
		const scratch = new Float32Array(size * size);
		const out = new Float32Array(size * size);
		const tolerance = float32Tolerance(size);
		durationCase(
			"Float32Array (Gauss-Jordan)",
			{ tags: { storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					invertFloat32_(source, scratch, out, size);
				}
				assertClose(
					checksum(size, (row, col) => out[row * size + col]!),
					wanted,
					tolerance,
				);
			},
		);
	}
}

function registerGeneralContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = wellConditionedMatrix(size, SEED);
	const relTol = float64Tolerance(size);

	{
		const source = toNested(logical, size);
		let out = source;
		durationCase("mathjs", { tags: { lib: "mathjs" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out = mathjsInv(source);
			}
			assertClose(
				checksum(size, (row, col) => out[row]![col]!),
				wanted,
				relTol,
			);
		});
	}

	{
		const source = new MlMatrix(toNested(logical, size));
		let out = source;
		durationCase("ml-matrix", { tags: { lib: "ml-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out = mlInverse(source);
			}
			assertClose(
				checksum(size, (row, col) => out.get(row, col)),
				wanted,
				relTol,
			);
		});
	}
}

function registerSize2Contenders_(): void {
	const size = 2;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = wellConditionedMatrix(size, SEED);

	{
		const source = toNested(logical, size) as [
			[number, number],
			[number, number],
		];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat2x2Invert(source);
				}
				assertClose(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
					float64Tolerance(size),
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat2.invert(out, source);
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float32Tolerance(size),
			);
		});
	}
}

function registerSize3Contenders_(): void {
	const size = 3;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = wellConditionedMatrix(size, SEED);
	type Row3 = [number, number, number];

	{
		const source = toNested(logical, size) as [Row3, Row3, Row3];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat3x3Invert(source);
				}
				assertClose(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
					float64Tolerance(size),
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat3.invert(out, source);
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float32Tolerance(size),
			);
		});
	}

	{
		const source = new ThreeMatrix3().fromArray(toColumnMajor(logical, size));
		const out = new ThreeMatrix3();
		durationCase("three", { tags: { lib: "three" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).invert();
			}
			assertClose(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
				float64Tolerance(size),
			);
		});
	}

	{
		const source = new MathGlMatrix3(toColumnMajor(logical, size));
		const out = new MathGlMatrix3();
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).invert();
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float64Tolerance(size),
			);
		});
	}

	{
		const source = wgpuMat3.create();
		source.set(toWgpuMat3(logical));
		const out = wgpuMat3.create();
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat3.inverse(source, out);
			}
			assertClose(
				checksum(size, (row, col) => out[col * 4 + row]!),
				wanted,
				float32Tolerance(size),
			);
		});
	}
}

function registerSize4Contenders_(): void {
	const size = 4;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = wellConditionedMatrix(size, SEED);
	type Row4 = [number, number, number, number];

	{
		const source = toNested(logical, size) as [Row4, Row4, Row4, Row4];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat4x4Invert(source);
				}
				assertClose(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
					float64Tolerance(size),
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat4.invert(out, source);
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float32Tolerance(size),
			);
		});
	}

	{
		const source = new ThreeMatrix4().fromArray(toColumnMajor(logical, size));
		const out = new ThreeMatrix4();
		durationCase("three", { tags: { lib: "three" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).invert();
			}
			assertClose(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
				float64Tolerance(size),
			);
		});
	}

	{
		const source = new MathGlMatrix4(toColumnMajor(logical, size));
		const out = new MathGlMatrix4();
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).invert();
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float64Tolerance(size),
			);
		});
	}

	{
		const source = wgpuMat4.create();
		source.set(toColumnMajor(logical, size));
		const out = wgpuMat4.create();
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat4.inverse(source, out);
			}
			assertClose(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
				float32Tolerance(size),
			);
		});
	}
}

for (const size of SIZES_FIXED) {
	durationCondition(`Matrix invert — ${size}×${size}`, () => {
		registerFlatContenders_(size);
		if (size === 2) {
			registerSize2Contenders_();
		} else if (size === 3) {
			registerSize3Contenders_();
		} else {
			registerSize4Contenders_();
		}
		registerGeneralContenders_(size);
	});
}

for (const size of SIZES_LARGE) {
	durationCondition(`Matrix invert — ${size}×${size}`, () => {
		registerFlatContenders_(size);
		registerGeneralContenders_(size);
	});
}
