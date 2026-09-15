import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clamp } from "@ac-kit/core";
import {
	mat2x2Determinant,
	mat3x3Determinant,
	mat4x4Determinant,
} from "@ac-kit/math-linear";
import {
	Matrix3 as MathGlMatrix3,
	Matrix4 as MathGlMatrix4,
} from "@math.gl/core";
import { mat2, mat3, mat4 } from "gl-matrix";
import { det as mathjsDet } from "mathjs";
import { determinant as mlDeterminant, Matrix as MlMatrix } from "ml-matrix";
import { Matrix3 as ThreeMatrix3, Matrix4 as ThreeMatrix4 } from "three";
import { mat3 as wgpuMat3, mat4 as wgpuMat4 } from "wgpu-matrix";

import {
	assertClose,
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
 * One operation — the determinant — which reduces a matrix to a scalar and so
 * allocates nothing for its result. That makes it the cleanest read on the
 * arithmetic alone, and it is where the two families genuinely diverge: the
 * fixed-size libraries expand cofactors in closed form, while anything general
 * must run an elimination.
 *
 * The operands are diagonally dominant, so every contender's pivoting makes the
 * same choices and the determinant stays near 1 instead of overflowing at
 * 256×256. Elimination divides, so results are compared with a tolerance.
 */

const SEEDS = [6, 7] as const;

/**
 * A determinant is a pure function of its operand, and a closed-form one
 * allocates nothing — so a loop calling it on a fixed matrix is hoisted bodily
 * out by V8 and reports a time near zero. Rotating through a pool of operands
 * keeps every call live. The cap is high for the same reason as in
 * `mat-transpose.bench.ts`: a 2×2 closed form is otherwise unmeasurable.
 */
const POOL = SEEDS.length;

function repeatsFor_(size: number): number {
	return clamp(Math.round(2_000_000 / size ** 3), 1, 20_000);
}

function poolMatrices_(size: number): number[][] {
	return SEEDS.map((seed) => wellConditionedMatrix(size, seed));
}

/*
 * LU with partial pivoting, one kernel per element type. `scratch` is caller-
 * owned because elimination destroys its input and a real implementation would
 * not allocate a copy per call.
 */

function determinantPlain_(
	source: number[],
	scratch: number[],
	size: number,
): number {
	for (let index = 0; index < scratch.length; index++) {
		scratch[index] = source[index]!;
	}
	let sign = 1;
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
		if (best === 0) {
			return 0;
		}
		if (pivotRow !== k) {
			for (let col = k; col < size; col++) {
				const swap = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swap;
			}
			sign = -sign;
		}
		const pivot = scratch[k * size + k]!;
		for (let row = k + 1; row < size; row++) {
			const factor = scratch[row * size + k]! / pivot;
			for (let col = k; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
			}
		}
	}
	let product = sign;
	for (let k = 0; k < size; k++) {
		product *= scratch[k * size + k]!;
	}

	return product;
}

function determinantFloat64_(
	source: Float64Array,
	scratch: Float64Array,
	size: number,
): number {
	scratch.set(source);
	let sign = 1;
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
		if (best === 0) {
			return 0;
		}
		if (pivotRow !== k) {
			for (let col = k; col < size; col++) {
				const swap = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swap;
			}
			sign = -sign;
		}
		const pivot = scratch[k * size + k]!;
		for (let row = k + 1; row < size; row++) {
			const factor = scratch[row * size + k]! / pivot;
			for (let col = k; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
			}
		}
	}
	let product = sign;
	for (let k = 0; k < size; k++) {
		product *= scratch[k * size + k]!;
	}

	return product;
}

function determinantFloat32_(
	source: Float32Array,
	scratch: Float32Array,
	size: number,
): number {
	scratch.set(source);
	let sign = 1;
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
		if (best === 0) {
			return 0;
		}
		if (pivotRow !== k) {
			for (let col = k; col < size; col++) {
				const swap = scratch[k * size + col]!;
				scratch[k * size + col] = scratch[pivotRow * size + col]!;
				scratch[pivotRow * size + col] = swap;
			}
			sign = -sign;
		}
		const pivot = scratch[k * size + k]!;
		for (let row = k + 1; row < size; row++) {
			const factor = scratch[row * size + k]! / pivot;
			for (let col = k; col < size; col++) {
				scratch[row * size + col]! -= factor * scratch[k * size + col]!;
			}
		}
	}
	let product = sign;
	for (let k = 0; k < size; k++) {
		product *= scratch[k * size + k]!;
	}

	return product;
}

/** The `Float64Array` elimination is the reference every contender is held to. */
function expectedDeterminant_(size: number): number {
	const last = (repeatsFor_(size) - 1) % POOL;
	const source = Float64Array.from(poolMatrices_(size)[last]!);

	return determinantFloat64_(source, new Float64Array(size * size), size);
}

function registerFlatContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedDeterminant_(size);
	const logicalPool = poolMatrices_(size);
	const relTol = float64Tolerance(size);

	{
		const pool = logicalPool.map((values) => values.slice());
		const scratch = packedArray(size * size);
		durationCase("flat number[] (LU)", { tags: { storage: "array" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = determinantPlain_(pool[index % POOL]!, scratch, size);
			}
			assertClose(value, wanted, relTol);
		});
	}

	{
		const pool = logicalPool.map((values) => Float64Array.from(values));
		const scratch = new Float64Array(size * size);
		durationCase("Float64Array (LU)", { tags: { storage: "f64" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = determinantFloat64_(pool[index % POOL]!, scratch, size);
			}
			assertClose(value, wanted, relTol);
		});
	}

	{
		const pool = logicalPool.map((values) => Float32Array.from(values));
		const scratch = new Float32Array(size * size);
		const tolerance = float32Tolerance(size);
		durationCase("Float32Array (LU)", { tags: { storage: "f32" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = determinantFloat32_(pool[index % POOL]!, scratch, size);
			}
			assertClose(value, wanted, tolerance);
		});
	}
}

function registerGeneralContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedDeterminant_(size);
	const logicalPool = poolMatrices_(size);
	const relTol = float64Tolerance(size);

	{
		const pool = logicalPool.map((values) => toNested(values, size));
		durationCase("mathjs", { tags: { lib: "mathjs" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = mathjsDet(pool[index % POOL]!);
			}
			assertClose(value, wanted, relTol);
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MlMatrix(toNested(values, size)),
		);
		durationCase("ml-matrix", { tags: { lib: "ml-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = mlDeterminant(pool[index % POOL]!);
			}
			assertClose(value, wanted, relTol);
		});
	}
}

function registerSize2Contenders_(): void {
	const size = 2;
	const repeats = repeatsFor_(size);
	const wanted = expectedDeterminant_(size);
	const logicalPool = poolMatrices_(size);

	{
		const pool = logicalPool.map(
			(values) =>
				toNested(values, size) as [[number, number], [number, number]],
		);
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				let value = 0;
				for (let index = 0; index < repeats; index++) {
					value = mat2x2Determinant(pool[index % POOL]!);
				}
				assertClose(value, wanted, float64Tolerance(size));
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = mat2.determinant(pool[index % POOL]!);
			}
			assertClose(value, wanted, float32Tolerance(size));
		});
	}
}

function registerSize3Contenders_(): void {
	const size = 3;
	const repeats = repeatsFor_(size);
	const wanted = expectedDeterminant_(size);
	const logicalPool = poolMatrices_(size);
	type Row3 = [number, number, number];

	{
		const pool = logicalPool.map(
			(values) => toNested(values, size) as [Row3, Row3, Row3],
		);
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				let value = 0;
				for (let index = 0; index < repeats; index++) {
					value = mat3x3Determinant(pool[index % POOL]!);
				}
				assertClose(value, wanted, float64Tolerance(size));
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = mat3.determinant(pool[index % POOL]!);
			}
			assertClose(value, wanted, float32Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map((values) =>
			new ThreeMatrix3().fromArray(toColumnMajor(values, size)),
		);
		durationCase("three", { tags: { lib: "three" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = pool[index % POOL]!.determinant();
			}
			assertClose(value, wanted, float64Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MathGlMatrix3(toColumnMajor(values, size)),
		);
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = pool[index % POOL]!.determinant();
			}
			assertClose(value, wanted, float64Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map((values) => {
			const matrix = wgpuMat3.create();
			matrix.set(toWgpuMat3(values));
			return matrix;
		});
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = wgpuMat3.determinant(pool[index % POOL]!);
			}
			assertClose(value, wanted, float32Tolerance(size));
		});
	}
}

function registerSize4Contenders_(): void {
	const size = 4;
	const repeats = repeatsFor_(size);
	const wanted = expectedDeterminant_(size);
	const logicalPool = poolMatrices_(size);
	type Row4 = [number, number, number, number];

	{
		const pool = logicalPool.map(
			(values) => toNested(values, size) as [Row4, Row4, Row4, Row4],
		);
		durationCase(
			"@ac-kit/math-linear (closed form)",
			{ tags: { lib: "math-linear" } },
			() => {
				let value = 0;
				for (let index = 0; index < repeats; index++) {
					value = mat4x4Determinant(pool[index % POOL]!);
				}
				assertClose(value, wanted, float64Tolerance(size));
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = mat4.determinant(pool[index % POOL]!);
			}
			assertClose(value, wanted, float32Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map((values) =>
			new ThreeMatrix4().fromArray(toColumnMajor(values, size)),
		);
		durationCase("three", { tags: { lib: "three" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = pool[index % POOL]!.determinant();
			}
			assertClose(value, wanted, float64Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MathGlMatrix4(toColumnMajor(values, size)),
		);
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = pool[index % POOL]!.determinant();
			}
			assertClose(value, wanted, float64Tolerance(size));
		});
	}

	{
		const pool = logicalPool.map((values) => {
			const matrix = wgpuMat4.create();
			matrix.set(toColumnMajor(values, size));
			return matrix;
		});
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			let value = 0;
			for (let index = 0; index < repeats; index++) {
				value = wgpuMat4.determinant(pool[index % POOL]!);
			}
			assertClose(value, wanted, float32Tolerance(size));
		});
	}
}

for (const size of SIZES_FIXED) {
	durationCondition(`Matrix determinant — ${size}×${size}`, () => {
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
	durationCondition(`Matrix determinant — ${size}×${size}`, () => {
		registerFlatContenders_(size);
		registerGeneralContenders_(size);
	});
}
