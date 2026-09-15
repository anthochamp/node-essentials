import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clamp } from "@ac-kit/core";
import {
	mat2x2Transpose,
	mat3x3Transpose,
	mat4x4Transpose,
} from "@ac-kit/math-linear";
import {
	Matrix3 as MathGlMatrix3,
	Matrix4 as MathGlMatrix4,
} from "@math.gl/core";
import { mat2, mat3, mat4 } from "gl-matrix";
import { transpose as mathjsTranspose } from "mathjs";
import { Matrix as MlMatrix } from "ml-matrix";
import { Matrix3 as ThreeMatrix3, Matrix4 as ThreeMatrix4 } from "three";
import { mat3 as wgpuMat3, mat4 as wgpuMat4 } from "wgpu-matrix";

import {
	checksum,
	dyadicMatrix,
	packedArray,
	SIZES_FIXED,
	SIZES_LARGE,
	toColumnMajor,
	toNested,
	toWgpuMat3,
} from "./__fixtures__/matrices.js";

/**
 * One operation — transposition — which is almost pure memory movement. It
 * isolates what the storage costs when there is no arithmetic to hide behind,
 * and it is where a library's choice between materialising a copy and handing
 * back a view shows up.
 */

const SEED = 4;

/**
 * A higher cap than the `O(size³)` suites use: transposition is so cheap that
 * 2,000 of them at 2×2 land near the harness's own resolution, and a case body
 * that returns almost immediately floods the sampler's IPC channel.
 */
function repeatsFor_(size: number): number {
	return clamp(Math.round(2_000_000 / size ** 2), 1, 20_000);
}

function expectedChecksum_(size: number): number {
	const source = dyadicMatrix(size, SEED);

	return checksum(size, (row, col) => source[col * size + row]!);
}

/* One kernel per element type — see the note in `mat-multiply.bench.ts`. */

function transposePlain_(source: number[], out: number[], size: number): void {
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			out[col * size + row] = source[row * size + col]!;
		}
	}
}

function transposeFloat64_(
	source: Float64Array,
	out: Float64Array,
	size: number,
): void {
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			out[col * size + row] = source[row * size + col]!;
		}
	}
}

function transposeFloat32_(
	source: Float32Array,
	out: Float32Array,
	size: number,
): void {
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			out[col * size + row] = source[row * size + col]!;
		}
	}
}

function registerFlatContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = dyadicMatrix(size, SEED);

	{
		const source = logical.slice();
		const out = packedArray(size * size);
		durationCase("flat number[]", { tags: { storage: "array" } }, () => {
			for (let index = 0; index < repeats; index++) {
				transposePlain_(source, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}

	{
		const source = Float64Array.from(logical);
		const out = new Float64Array(size * size);
		durationCase("Float64Array", { tags: { storage: "f64" } }, () => {
			for (let index = 0; index < repeats; index++) {
				transposeFloat64_(source, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}

	{
		const source = Float32Array.from(logical);
		const out = new Float32Array(size * size);
		durationCase("Float32Array", { tags: { storage: "f32" } }, () => {
			for (let index = 0; index < repeats; index++) {
				transposeFloat32_(source, out, size);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row * size + col]!),
				wanted,
			);
		});
	}
}

function registerGeneralContenders_(size: number): void {
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = dyadicMatrix(size, SEED);

	{
		const source = toNested(logical, size);
		let out = source;
		durationCase("mathjs", { tags: { lib: "mathjs" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out = mathjsTranspose(source);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[row]![col]!),
				wanted,
			);
		});
	}

	{
		const source = new MlMatrix(toNested(logical, size));
		let out = source;
		durationCase("ml-matrix", { tags: { lib: "ml-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out = source.transpose();
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.get(row, col)),
				wanted,
			);
		});
	}
}

function registerSize2Contenders_(): void {
	const size = 2;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = dyadicMatrix(size, SEED);

	{
		const source = toNested(logical, size) as [
			[number, number],
			[number, number],
		];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (nested tuples)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat2x2Transpose(source);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat2.transpose(out, source);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}
}

function registerSize3Contenders_(): void {
	const size = 3;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = dyadicMatrix(size, SEED);
	type Row3 = [number, number, number];

	{
		const source = toNested(logical, size) as [Row3, Row3, Row3];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (nested tuples)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat3x3Transpose(source);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat3.transpose(out, source);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = new ThreeMatrix3().fromArray(toColumnMajor(logical, size));
		const out = new ThreeMatrix3();
		durationCase("three", { tags: { lib: "three" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).transpose();
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = new MathGlMatrix3(toColumnMajor(logical, size));
		const out = new MathGlMatrix3();
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).transpose();
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = wgpuMat3.create();
		source.set(toWgpuMat3(logical));
		const out = wgpuMat3.create();
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat3.transpose(source, out);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * 4 + row]!),
				wanted,
			);
		});
	}
}

function registerSize4Contenders_(): void {
	const size = 4;
	const repeats = repeatsFor_(size);
	const wanted = expectedChecksum_(size);
	const logical = dyadicMatrix(size, SEED);
	type Row4 = [number, number, number, number];

	{
		const source = toNested(logical, size) as [Row4, Row4, Row4, Row4];
		let out = source;
		durationCase(
			"@ac-kit/math-linear (nested tuples)",
			{ tags: { lib: "math-linear" } },
			() => {
				for (let index = 0; index < repeats; index++) {
					out = mat4x4Transpose(source);
				}
				assert.strictEqual(
					checksum(size, (row, col) => out[row]![col]!),
					wanted,
				);
			},
		);
	}

	{
		const source = Float32Array.from(toColumnMajor(logical, size));
		const out = new Float32Array(size * size);
		durationCase("gl-matrix", { tags: { lib: "gl-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				mat4.transpose(out, source);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = new ThreeMatrix4().fromArray(toColumnMajor(logical, size));
		const out = new ThreeMatrix4();
		durationCase("three", { tags: { lib: "three" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).transpose();
			}
			assert.strictEqual(
				checksum(size, (row, col) => out.elements[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = new MathGlMatrix4(toColumnMajor(logical, size));
		const out = new MathGlMatrix4();
		durationCase("@math.gl/core", { tags: { lib: "math.gl" } }, () => {
			for (let index = 0; index < repeats; index++) {
				out.copy(source).transpose();
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}

	{
		const source = wgpuMat4.create();
		source.set(toColumnMajor(logical, size));
		const out = wgpuMat4.create();
		durationCase("wgpu-matrix", { tags: { lib: "wgpu-matrix" } }, () => {
			for (let index = 0; index < repeats; index++) {
				wgpuMat4.transpose(source, out);
			}
			assert.strictEqual(
				checksum(size, (row, col) => out[col * size + row]!),
				wanted,
			);
		});
	}
}

for (const size of SIZES_FIXED) {
	durationCondition(`Matrix transpose — ${size}×${size}`, () => {
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
	durationCondition(`Matrix transpose — ${size}×${size}`, () => {
		registerFlatContenders_(size);
		registerGeneralContenders_(size);
	});
}
