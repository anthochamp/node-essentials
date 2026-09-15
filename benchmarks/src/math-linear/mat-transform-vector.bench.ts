import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clamp } from "@ac-kit/core";
import {
	vec2ApplyMat2,
	vec3ApplyMat3,
	vec4ApplyMat4,
} from "@ac-kit/math-linear";
import {
	Matrix3 as MathGlMatrix3,
	Matrix4 as MathGlMatrix4,
} from "@math.gl/core";
import { vec2, vec3, vec4 } from "gl-matrix";
import { multiply as mathjsMultiply } from "mathjs";
import { Matrix as MlMatrix } from "ml-matrix";
import {
	Matrix3 as ThreeMatrix3,
	Matrix4 as ThreeMatrix4,
	Vector3 as ThreeVector3,
	Vector4 as ThreeVector4,
} from "three";
import {
	mat3 as wgpuMat3,
	mat4 as wgpuMat4,
	vec3 as wgpuVec3,
	vec4 as wgpuVec4,
} from "wgpu-matrix";

import {
	dyadicMatrix,
	packedArray,
	SIZES_FIXED,
	SIZES_LARGE,
	toColumnMajor,
	toNested,
	toWgpuMat3,
	transformReference,
	vectorChecksum,
} from "./__fixtures__/matrices.js";

/**
 * One operation — one matrix applied to a batch of vectors — which is what a
 * renderer, a colour pipeline or a point cloud actually spends its time on. It
 * is a different question from the matrix product: the arithmetic is `O(size²)`
 * per vector rather than `O(size³)` per pair, and the result is small enough
 * that whether a library allocates it dominates.
 */

const BATCH = 256;
const MATRIX_SEED = 3;

function repeatsFor_(size: number): number {
	return clamp(Math.round(2_000_000 / (BATCH * size ** 2)), 1, 8);
}

function batchVectors_(size: number): number[][] {
	return Array.from({ length: BATCH }, (_unused, index) =>
		dyadicMatrix(size, index + 11).slice(0, size),
	);
}

function expectedChecksum_(size: number): number {
	const matrix = dyadicMatrix(size, MATRIX_SEED);
	let total = 0;
	const vectors = batchVectors_(size);
	for (let index = 0; index < BATCH; index++) {
		const result = transformReference(matrix, vectors[index]!, size);
		total += vectorChecksum(size, (at) => result[at]!) * (index + 1);
	}

	return total;
}

/*
 * One kernel per element type, for the same reason as in `mat-multiply`: a
 * shared body taking a union would measure V8's dispatch instead of the layout.
 */

function transformPlain_(
	matrix: number[],
	vectors: number[],
	out: number[],
	size: number,
): void {
	for (let item = 0; item < BATCH; item++) {
		const base = item * size;
		for (let row = 0; row < size; row++) {
			let sum = 0;
			for (let col = 0; col < size; col++) {
				sum += matrix[row * size + col]! * vectors[base + col]!;
			}
			out[base + row] = sum;
		}
	}
}

function transformFloat64_(
	matrix: Float64Array,
	vectors: Float64Array,
	out: Float64Array,
	size: number,
): void {
	for (let item = 0; item < BATCH; item++) {
		const base = item * size;
		for (let row = 0; row < size; row++) {
			let sum = 0;
			for (let col = 0; col < size; col++) {
				sum += matrix[row * size + col]! * vectors[base + col]!;
			}
			out[base + row] = sum;
		}
	}
}

function transformFloat32_(
	matrix: Float32Array,
	vectors: Float32Array,
	out: Float32Array,
	size: number,
): void {
	for (let item = 0; item < BATCH; item++) {
		const base = item * size;
		for (let row = 0; row < size; row++) {
			let sum = 0;
			for (let col = 0; col < size; col++) {
				sum += matrix[row * size + col]! * vectors[base + col]!;
			}
			out[base + row] = sum;
		}
	}
}

/** Sums the per-vector checksums of a batch held in one flat buffer. */
function flatBatchChecksum_(
	out: { [index: number]: number | undefined },
	size: number,
): number {
	let total = 0;
	for (let item = 0; item < BATCH; item++) {
		total += vectorChecksum(size, (at) => out[item * size + at]!) * (item + 1);
	}

	return total;
}

function registerFlatContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalMatrix = dyadicMatrix(size, MATRIX_SEED);
	const logicalVectors = batchVectors_(size).flat();

	{
		const matrix = logicalMatrix.slice();
		const vectors = logicalVectors.slice();
		const out = packedArray(BATCH * size);
		durationCase(
			"flat number[]",
			{ tags: { storage: "array", major: "row" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					transformPlain_(matrix, vectors, out, size);
				}
				assert.strictEqual(flatBatchChecksum_(out, size), wanted);
			},
		);
	}

	{
		const matrix = Float64Array.from(logicalMatrix);
		const vectors = Float64Array.from(logicalVectors);
		const out = new Float64Array(BATCH * size);
		durationCase(
			"Float64Array",
			{ tags: { storage: "f64", major: "row" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					transformFloat64_(matrix, vectors, out, size);
				}
				assert.strictEqual(flatBatchChecksum_(out, size), wanted);
			},
		);
	}

	{
		const matrix = Float32Array.from(logicalMatrix);
		const vectors = Float32Array.from(logicalVectors);
		const out = new Float32Array(BATCH * size);
		durationCase(
			"Float32Array",
			{ tags: { storage: "f32", major: "row" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					transformFloat32_(matrix, vectors, out, size);
				}
				assert.strictEqual(flatBatchChecksum_(out, size), wanted);
			},
		);
	}
}

function registerGeneralContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalMatrix = dyadicMatrix(size, MATRIX_SEED);
	const logicalVectors = batchVectors_(size);

	{
		const matrix = toNested(logicalMatrix, size);
		const vectors = logicalVectors.map((values) => values.slice());
		const out: number[][] = Array.from({ length: BATCH });
		durationCase(
			"mathjs",
			{ tags: { lib: "mathjs", storage: "nested" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						out[item] = mathjsMultiply(matrix, vectors[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = new MlMatrix(toNested(logicalMatrix, size));
		const vectors = logicalVectors.map(
			(values) => new MlMatrix(values.map((value) => [value])),
		);
		const out: MlMatrix[] = Array.from({ length: BATCH });
		durationCase(
			"ml-matrix",
			{ tags: { lib: "ml-matrix", storage: "nested" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						out[item] = matrix.mmul(vectors[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total +=
						vectorChecksum(size, (at) => out[item]!.get(at, 0)) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}
}

function registerSize2Contenders_(): void {
	const size = 2;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalMatrix = dyadicMatrix(size, MATRIX_SEED);
	const logicalVectors = batchVectors_(size);

	{
		const matrix = toNested(logicalMatrix, size) as [
			[number, number],
			[number, number],
		];
		const vectors = logicalVectors.map(
			(values) => values.slice() as [number, number],
		);
		const out: [number, number][] = Array.from({ length: BATCH });
		durationCase(
			"@ac-kit/math-linear (fresh tuple per vector)",
			{ tags: { lib: "math-linear", storage: "tuple" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						out[item] = vec2ApplyMat2(vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = Float32Array.from(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => Float32Array.from(values));
		const out = Array.from(
			{ length: BATCH },
			() => new Float32Array(size),
		) as Float32Array[];
		durationCase(
			"gl-matrix",
			{ tags: { lib: "gl-matrix", storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						vec2.transformMat2(out[item]!, vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}
}

function registerSize3Contenders_(): void {
	const size = 3;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalMatrix = dyadicMatrix(size, MATRIX_SEED);
	const logicalVectors = batchVectors_(size);
	type Vec3Tuple = [number, number, number];

	{
		const matrix = toNested(logicalMatrix, size) as [
			Vec3Tuple,
			Vec3Tuple,
			Vec3Tuple,
		];
		const vectors = logicalVectors.map((values) => values.slice() as Vec3Tuple);
		const out: Vec3Tuple[] = Array.from({ length: BATCH });
		durationCase(
			"@ac-kit/math-linear (fresh tuple per vector)",
			{ tags: { lib: "math-linear", storage: "tuple" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						out[item] = vec3ApplyMat3(vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = Float32Array.from(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => Float32Array.from(values));
		const out = Array.from({ length: BATCH }, () => new Float32Array(size));
		durationCase(
			"gl-matrix",
			{ tags: { lib: "gl-matrix", storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						vec3.transformMat3(out[item]!, vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = new ThreeMatrix3().fromArray(
			toColumnMajor(logicalMatrix, size),
		);
		const vectors = logicalVectors.map(
			(values) => new ThreeVector3(values[0], values[1], values[2]),
		);
		const out = Array.from({ length: BATCH }, () => new ThreeVector3());
		// `applyMatrix3` mutates in place and there is no out-parameter form, so
		// `copy` first — otherwise the second repeat transforms an already
		// transformed vector.
		durationCase("three", { tags: { lib: "three", storage: "object" } }, () => {
			for (let index = 0; index < repeats; index++) {
				for (let item = 0; item < BATCH; item++) {
					out[item]!.copy(vectors[item]!).applyMatrix3(matrix);
				}
			}
			let total = 0;
			for (let item = 0; item < BATCH; item++) {
				const value = out[item]!;
				total +=
					vectorChecksum(size, (at) => value.getComponent(at)) * (item + 1);
			}
			assert.strictEqual(total, wanted);
		});
	}

	{
		const matrix = new MathGlMatrix3(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => values.slice());
		const out = Array.from({ length: BATCH }, () => packedArray(size));
		durationCase(
			"@math.gl/core",
			{ tags: { lib: "math.gl", storage: "array" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						matrix.transform(vectors[item]!, out[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = wgpuMat3.create();
		matrix.set(toWgpuMat3(logicalMatrix));
		const vectors = logicalVectors.map((values) => Float32Array.from(values));
		const out = Array.from({ length: BATCH }, () => wgpuVec3.create());
		durationCase(
			"wgpu-matrix",
			{ tags: { lib: "wgpu-matrix", storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						wgpuVec3.transformMat3(vectors[item]!, matrix, out[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}
}

function registerSize4Contenders_(): void {
	const size = 4;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logicalMatrix = dyadicMatrix(size, MATRIX_SEED);
	const logicalVectors = batchVectors_(size);
	type Vec4Tuple = [number, number, number, number];
	type Row4 = [number, number, number, number];

	{
		const matrix = toNested(logicalMatrix, size) as [Row4, Row4, Row4, Row4];
		const vectors = logicalVectors.map((values) => values.slice() as Vec4Tuple);
		const out: Vec4Tuple[] = Array.from({ length: BATCH });
		durationCase(
			"@ac-kit/math-linear (fresh tuple per vector)",
			{ tags: { lib: "math-linear", storage: "tuple" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						out[item] = vec4ApplyMat4(vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = Float32Array.from(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => Float32Array.from(values));
		const out = Array.from({ length: BATCH }, () => new Float32Array(size));
		durationCase(
			"gl-matrix",
			{ tags: { lib: "gl-matrix", storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						vec4.transformMat4(out[item]!, vectors[item]!, matrix);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = new ThreeMatrix4().fromArray(
			toColumnMajor(logicalMatrix, size),
		);
		const vectors = logicalVectors.map(
			(values) => new ThreeVector4(values[0], values[1], values[2], values[3]),
		);
		const out = Array.from({ length: BATCH }, () => new ThreeVector4());
		durationCase("three", { tags: { lib: "three", storage: "object" } }, () => {
			for (let index = 0; index < repeats; index++) {
				for (let item = 0; item < BATCH; item++) {
					out[item]!.copy(vectors[item]!).applyMatrix4(matrix);
				}
			}
			let total = 0;
			for (let item = 0; item < BATCH; item++) {
				const value = out[item]!;
				total +=
					vectorChecksum(size, (at) => value.getComponent(at)) * (item + 1);
			}
			assert.strictEqual(total, wanted);
		});
	}

	{
		const matrix = new MathGlMatrix4(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => values.slice());
		const out = Array.from({ length: BATCH }, () => packedArray(size));
		durationCase(
			"@math.gl/core",
			{ tags: { lib: "math.gl", storage: "array" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						matrix.transform(vectors[item]!, out[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const matrix = wgpuMat4.create();
		matrix.set(toColumnMajor(logicalMatrix, size));
		const vectors = logicalVectors.map((values) => Float32Array.from(values));
		const out = Array.from({ length: BATCH }, () => wgpuVec4.create());
		durationCase(
			"wgpu-matrix",
			{ tags: { lib: "wgpu-matrix", storage: "f32" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					for (let item = 0; item < BATCH; item++) {
						wgpuVec4.transformMat4(vectors[item]!, matrix, out[item]!);
					}
				}
				let total = 0;
				for (let item = 0; item < BATCH; item++) {
					total += vectorChecksum(size, (at) => out[item]![at]!) * (item + 1);
				}
				assert.strictEqual(total, wanted);
			},
		);
	}
}

for (const size of SIZES_FIXED) {
	durationCondition(
		`Matrix × vector — ${size}×${size} over ${BATCH.toLocaleString("en-US")} vectors`,
		() => {
			registerFlatContenders_(size);
			if (size === 2) {
				registerSize2Contenders_();
			} else if (size === 3) {
				registerSize3Contenders_();
			} else {
				registerSize4Contenders_();
			}
			registerGeneralContenders_(size);
		},
	);
}

for (const size of SIZES_LARGE) {
	durationCondition(
		`Matrix × vector — ${size}×${size} over ${BATCH.toLocaleString("en-US")} vectors`,
		() => {
			registerFlatContenders_(size);
			registerGeneralContenders_(size);
		},
	);
}
