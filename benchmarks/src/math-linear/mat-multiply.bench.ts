import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import { clamp } from "@ac-kit/core";
import {
	mat2x2Multiply,
	mat3x3Multiply,
	mat4x4Multiply,
} from "@ac-kit/math-linear";
import {
	Matrix3 as MathGlMatrix3,
	Matrix4 as MathGlMatrix4,
} from "@math.gl/core";
import { mat2, mat3, mat4 } from "gl-matrix";
import { multiply as mathjsMultiply } from "mathjs";
import { Matrix as MlMatrix } from "ml-matrix";
import ndarray from "ndarray";
import gemm from "ndarray-gemm";
import { Matrix3 as ThreeMatrix3, Matrix4 as ThreeMatrix4 } from "three";
import { mat3 as wgpuMat3, mat4 as wgpuMat4 } from "wgpu-matrix";

import {
	checksum,
	dyadicMatrix,
	multiplyReference,
	packedArray,
	SIZES_FIXED,
	SIZES_LARGE,
	toColumnMajor,
	toNested,
	toWgpuMat3,
} from "./__fixtures__/matrices.js";

/**
 * One operation — the product of two square matrices — across every storage a
 * matrix library in this ecosystem picks, at every size those libraries reach.
 *
 * Each size is its own condition: the `rel` column only means something between
 * contenders doing the same amount of work, and a 4×4 product is 8× the
 * arithmetic of a 2×2. Sizes above 4×4 are a separate question again — no
 * fixed-size library reaches them, so those conditions rank the candidates for
 * an arbitrary-dimension `Matrix` against the two general-purpose libraries.
 */

const A_SEEDS = [1, 2] as const;
const B_SEED = 5;

/**
 * Holds the arithmetic per case body near constant so the `O(size²)` checksum
 * stays negligible against the `O(size³)` product at every size.
 *
 * Capped, because arithmetic is not the only per-call cost: `mathjs` dispatches
 * through `typed-function` on every call, so the flop-derived count of 250,000
 * at 2×2 runs for half a second per sample and times the child out.
 */
function repeatsFor_(size: number): number {
	return clamp(Math.round(2_000_000 / size ** 3), 1, 2_000);
}

/**
 * The operand pool defeats dead-store elimination: every iteration writes a
 * different product, so none of the writes before the last is redundant.
 */
function operandSeedAt_(index: number): number {
	return A_SEEDS[index % A_SEEDS.length]!;
}

function expectedChecksum_(size: number): number {
	const repeats = repeatsFor_(size);
	const a = dyadicMatrix(size, operandSeedAt_(repeats - 1));
	const product = multiplyReference(a, dyadicMatrix(size, B_SEED), size);

	return checksum(size, (row, col) => product[row * size + col]!);
}

/*
 * Three separate kernels rather than one taking a union. A single body shared
 * by `number[]`, `Float64Array` and `Float32Array` is a polymorphic call site
 * and measures V8's dispatch instead of the layout — the duplication here is
 * what makes the comparison mean anything.
 *
 * All three use the `ikj` order, which streams both `b` and `out` along rows;
 * the textbook `ijk` order strides `b` by `size` and collapses at 256×256.
 * Reordering the summation is exact on dyadic operands, so every contender
 * still produces the identical checksum.
 */

function multiplyPlain_(
	a: number[],
	b: number[],
	out: number[],
	size: number,
): void {
	out.fill(0);
	for (let row = 0; row < size; row++) {
		for (let k = 0; k < size; k++) {
			const scale = a[row * size + k]!;
			for (let col = 0; col < size; col++) {
				out[row * size + col]! += scale * b[k * size + col]!;
			}
		}
	}
}

function multiplyFloat64_(
	a: Float64Array,
	b: Float64Array,
	out: Float64Array,
	size: number,
): void {
	out.fill(0);
	for (let row = 0; row < size; row++) {
		for (let k = 0; k < size; k++) {
			const scale = a[row * size + k]!;
			for (let col = 0; col < size; col++) {
				out[row * size + col]! += scale * b[k * size + col]!;
			}
		}
	}
}

function multiplyFloat32_(
	a: Float32Array,
	b: Float32Array,
	out: Float32Array,
	size: number,
): void {
	out.fill(0);
	for (let row = 0; row < size; row++) {
		for (let k = 0; k < size; k++) {
			const scale = a[row * size + k]!;
			for (let col = 0; col < size; col++) {
				out[row * size + col]! += scale * b[k * size + col]!;
			}
		}
	}
}

/** The three flat row-major candidates for an in-repo batched storage. */
function registerFlatContenders_(
	size: number,
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalPool = A_SEEDS.map((seed) => dyadicMatrix(size, seed));
	const logicalB = dyadicMatrix(size, B_SEED);

	{
		const pool = logicalPool.map((values) => values.slice());
		const b = logicalB.slice();
		const out = packedArray(size * size);
		register("flat number[]", { storage: "array", major: "row" }, () => {
			for (let index = 0; index < repeats; index++) {
				multiplyPlain_(pool[index % pool.length]!, b, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) => Float64Array.from(values));
		const b = Float64Array.from(logicalB);
		const out = new Float64Array(size * size);
		register("Float64Array", { storage: "f64", major: "row" }, () => {
			for (let index = 0; index < repeats; index++) {
				multiplyFloat64_(pool[index % pool.length]!, b, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) => Float32Array.from(values));
		const b = Float32Array.from(logicalB);
		const out = new Float32Array(size * size);
		register("Float32Array", { storage: "f32", major: "row" }, () => {
			for (let index = 0; index < repeats; index++) {
				multiplyFloat32_(pool[index % pool.length]!, b, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}
}

/** The two arbitrary-dimension libraries, plus `ndarray`'s strided view. */
function registerGeneralContenders_(
	size: number,
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalPool = A_SEEDS.map((seed) => dyadicMatrix(size, seed));
	const logicalB = dyadicMatrix(size, B_SEED);

	{
		const pool = logicalPool.map((values) => toNested(values, size));
		const b = toNested(logicalB, size);
		register("mathjs", { lib: "mathjs", storage: "nested" }, () => {
			let out = pool[0]!;
			for (let index = 0; index < repeats; index++) {
				out = mathjsMultiply(pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row]![col]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MlMatrix(toNested(values, size)),
		);
		const b = new MlMatrix(toNested(logicalB, size));
		register("ml-matrix", { lib: "ml-matrix", storage: "nested" }, () => {
			let out = pool[0]!;
			for (let index = 0; index < repeats; index++) {
				out = pool[index % pool.length]!.mmul(b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.get(row, col)),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) =>
			ndarray(Float64Array.from(values), [size, size]),
		);
		const b = ndarray(Float64Array.from(logicalB), [size, size]);
		const out = ndarray(new Float64Array(size * size), [size, size]);
		register(
			"ndarray + ndarray-gemm",
			{ lib: "ndarray", storage: "f64" },
			() => {
				for (let index = 0; index < repeats; index++) {
					gemm(out, pool[index % pool.length]!, b);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out.get(row, col)),
					wanted,
				);
			},
		);
	}
}

function registerSize2Contenders_(
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const size = 2;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalPool = A_SEEDS.map((seed) => dyadicMatrix(size, seed));
	const logicalB = dyadicMatrix(size, B_SEED);

	{
		const pool = logicalPool.map(
			(values) =>
				toNested(values, size) as [[number, number], [number, number]],
		);
		const b = toNested(logicalB, size) as [[number, number], [number, number]];
		register(
			"@ac-kit/math-linear (nested tuples)",
			{ lib: "math-linear", storage: "tuple" },
			() => {
				let out = pool[0]!;
				for (let index = 0; index < repeats; index++) {
					out = mat2x2Multiply(pool[index % pool.length]!, b);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		const b = Float32Array.from(toColumnMajor(logicalB, size));
		const out = new Float32Array(size * size);
		register("gl-matrix", { lib: "gl-matrix", storage: "f32" }, () => {
			for (let index = 0; index < repeats; index++) {
				mat2.multiply(out, pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}
}

function registerSize3Contenders_(
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const size = 3;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalPool = A_SEEDS.map((seed) => dyadicMatrix(size, seed));
	const logicalB = dyadicMatrix(size, B_SEED);
	type Nested3 = [
		[number, number, number],
		[number, number, number],
		[number, number, number],
	];

	{
		const pool = logicalPool.map((values) => toNested(values, size) as Nested3);
		const b = toNested(logicalB, size) as Nested3;
		register(
			"@ac-kit/math-linear (nested tuples)",
			{ lib: "math-linear", storage: "tuple" },
			() => {
				let out = pool[0]!;
				for (let index = 0; index < repeats; index++) {
					out = mat3x3Multiply(pool[index % pool.length]!, b);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		const b = Float32Array.from(toColumnMajor(logicalB, size));
		const out = new Float32Array(size * size);
		register("gl-matrix", { lib: "gl-matrix", storage: "f32" }, () => {
			for (let index = 0; index < repeats; index++) {
				mat3.multiply(out, pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) =>
			new ThreeMatrix3().fromArray(toColumnMajor(values, size)),
		);
		const b = new ThreeMatrix3().fromArray(toColumnMajor(logicalB, size));
		const out = new ThreeMatrix3();
		register("three", { lib: "three", storage: "array" }, () => {
			for (let index = 0; index < repeats; index++) {
				out.multiplyMatrices(pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MathGlMatrix3(toColumnMajor(values, size)),
		);
		const b = new MathGlMatrix3(toColumnMajor(logicalB, size));
		const out = new MathGlMatrix3();
		// No out-parameter product in this API: `copy` then `multiplyRight` is
		// the only allocation-free form a consumer can write.
		register("@math.gl/core", { lib: "math.gl", storage: "array" }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(pool[index % pool.length]!).multiplyRight(b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) => {
			const matrix = wgpuMat3.create();
			matrix.set(toWgpuMat3(values));
			return matrix;
		});
		const b = wgpuMat3.create();
		b.set(toWgpuMat3(logicalB));
		const out = wgpuMat3.create();
		// A `wgpu-matrix` 3×3 is 12 floats — three columns padded to WebGPU's
		// 16-byte column alignment — so its column stride is 4, not 3.
		register("wgpu-matrix", { lib: "wgpu-matrix", storage: "f32" }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat3.multiply(pool[index % pool.length]!, b, out);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * 4 + row]!),
				wanted,
			);
		});
	}
}

function registerSize4Contenders_(
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const size = 4;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalPool = A_SEEDS.map((seed) => dyadicMatrix(size, seed));
	const logicalB = dyadicMatrix(size, B_SEED);
	type Row4 = [number, number, number, number];
	type Nested4 = [Row4, Row4, Row4, Row4];

	{
		const pool = logicalPool.map((values) => toNested(values, size) as Nested4);
		const b = toNested(logicalB, size) as Nested4;
		register(
			"@ac-kit/math-linear (nested tuples)",
			{ lib: "math-linear", storage: "tuple" },
			() => {
				let out = pool[0]!;
				for (let index = 0; index < repeats; index++) {
					out = mat4x4Multiply(pool[index % pool.length]!, b);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const pool = logicalPool.map((values) =>
			Float32Array.from(toColumnMajor(values, size)),
		);
		const b = Float32Array.from(toColumnMajor(logicalB, size));
		const out = new Float32Array(size * size);
		register("gl-matrix", { lib: "gl-matrix", storage: "f32" }, () => {
			for (let index = 0; index < repeats; index++) {
				mat4.multiply(out, pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) =>
			new ThreeMatrix4().fromArray(toColumnMajor(values, size)),
		);
		const b = new ThreeMatrix4().fromArray(toColumnMajor(logicalB, size));
		const out = new ThreeMatrix4();
		register("three", { lib: "three", storage: "array" }, () => {
			for (let index = 0; index < repeats; index++) {
				out.multiplyMatrices(pool[index % pool.length]!, b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map(
			(values) => new MathGlMatrix4(toColumnMajor(values, size)),
		);
		const b = new MathGlMatrix4(toColumnMajor(logicalB, size));
		const out = new MathGlMatrix4();
		register("@math.gl/core", { lib: "math.gl", storage: "array" }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(pool[index % pool.length]!).multiplyRight(b);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const pool = logicalPool.map((values) => {
			const matrix = wgpuMat4.create();
			matrix.set(toColumnMajor(values, size));
			return matrix;
		});
		const b = wgpuMat4.create();
		b.set(toColumnMajor(logicalB, size));
		const out = wgpuMat4.create();
		register("wgpu-matrix", { lib: "wgpu-matrix", storage: "f32" }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat4.multiply(pool[index % pool.length]!, b, out);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}
}

function registerFixedSizeContenders_(
	size: (typeof SIZES_FIXED)[number],
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	if (size === 2) {
		// `three`, `@math.gl/core` and `wgpu-matrix` have no 2×2 product:
		// three's `Matrix2` carries only `set`/`identity`/`fromArray`, and the
		// other two start at 3×3.
		registerSize2Contenders_(register);
		return;
	}
	if (size === 3) {
		registerSize3Contenders_(register);
		return;
	}

	registerSize4Contenders_(register);
}

for (const size of SIZES_FIXED) {
	durationCondition(`Matrix multiply — ${size}×${size}`, () => {
		registerFlatContenders_(size, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
		registerFixedSizeContenders_(size, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
		registerGeneralContenders_(size, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
	});
}

for (const size of SIZES_LARGE) {
	durationCondition(`Matrix multiply — ${size}×${size}`, () => {
		registerFlatContenders_(size, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
		registerGeneralContenders_(size, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
	});
}

/**
 * Allocation is measured at one size only — 4×4, where every contender is
 * present — because `measure-resource` forks a child process per case.
 */
resourceCondition("Matrix multiply — 4×4 — allocation", () => {
	registerFlatContenders_(4, (name, tags, run) =>
		resourceCase(name, { tags }, run),
	);
	registerSize4Contenders_((name, tags, run) =>
		resourceCase(name, { tags }, run),
	);
	registerGeneralContenders_(4, (name, tags, run) =>
		resourceCase(name, { tags }, run),
	);
});
