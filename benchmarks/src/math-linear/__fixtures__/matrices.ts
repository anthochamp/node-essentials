import assert from "node:assert";

import { isCloseTo } from "@ac-kit/core";

/**
 * Sizes every contender implements. `math-linear`, `gl-matrix`, `three`,
 * `@math.gl/core` and `wgpu-matrix` all stop at 4×4.
 */
export const SIZES_FIXED = [2, 3, 4] as const;

/**
 * Sizes only the arbitrary-dimension contenders reach. These answer a different
 * question from {@link SIZES_FIXED} — what a flat-buffer `Matrix` would have to
 * beat — so they are always separate conditions, never ranked against a 4×4.
 */
export const SIZES_LARGE = [8, 64, 256] as const;

/**
 * Row-major, `value(row, col) === flat[row * size + col]`, which is how
 * `math-linear`, `mathjs` and `ml-matrix` all index. Every other contender is
 * column-major and gets converted once, in setup.
 */
export type FlatMatrix = readonly number[];

/**
 * Quarters in `[0, 1.75]`. Dyadic, so `Float32Array` holds them exactly and
 * every intermediate of a multiply stays exact up to 256×256: entries are
 * multiples of 1/4, products multiples of 1/16 bounded by 3.0625, and a
 * 256-term row-column sum is at most 784 — 12,544 sixteenths, well inside a
 * 24-bit mantissa. A layout that is fast because it lost precision therefore
 * fails the assertion rather than winning the table.
 */
export function dyadicMatrix(size: number, seed: number): number[] {
	const values: number[] = Array.from({ length: size * size });
	for (let index = 0; index < values.length; index++) {
		values[index] = (((index + 1) * (seed + 7)) % 8) / 4;
	}

	return values;
}

/**
 * Diagonally dominant, so every contender's pivoting finds the same pivots and
 * the determinant stays near 1 instead of overflowing at 256×256. Inversion and
 * determinant divide, so results here are compared with a tolerance rather than
 * exactly — see {@link assertClose}.
 */
export function wellConditionedMatrix(size: number, seed: number): number[] {
	const values = dyadicMatrix(size, seed);
	for (let index = 0; index < values.length; index++) {
		values[index] = (values[index]! - 0.875) / size;
	}
	for (let diagonal = 0; diagonal < size; diagonal++) {
		values[diagonal * size + diagonal] = 1;
	}

	return values;
}

/**
 * A zero-filled array that V8 gives a `PACKED` elements kind. `new
 * Array(n).fill(0)` leaves it `HOLEY`, whose every read carries a hole check
 * and a prototype-chain lookup — a `number[]` contender built that way measures
 * the hole check rather than the layout it is standing in for.
 */
export function packedArray(length: number): number[] {
	return Array.from({ length }, () => 0);
}

/** Column-major storage of the same logical matrix, for the WebGL-shaped APIs. */
export function toColumnMajor(matrix: FlatMatrix, size: number): number[] {
	const values: number[] = Array.from({ length: size * size });
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			values[col * size + row] = matrix[row * size + col]!;
		}
	}

	return values;
}

/**
 * `wgpu-matrix` pads a 3×3 to three columns of four floats for WebGPU's 16-byte
 * column alignment, so its `Mat3` is 12 elements and column `c` starts at
 * `4c`.
 */
export function toWgpuMat3(matrix: FlatMatrix): number[] {
	const values: number[] = Array.from({ length: 12 }, () => 0);
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) {
			values[col * 4 + row] = matrix[row * 3 + col]!;
		}
	}

	return values;
}

/**
 * Row-major nested rows, the shape `mathjs`, `ml-matrix` and `math-linear`
 * take.
 */
export function toNested(matrix: FlatMatrix, size: number): number[][] {
	const rows: number[][] = Array.from({ length: size });
	for (let row = 0; row < size; row++) {
		rows[row] = Array.from(matrix.slice(row * size, row * size + size));
	}

	return rows;
}

/**
 * Weighted by logical position, so a contender that returns the transpose fails
 * instead of matching. `O(size²)` — called once per case, against a loop that
 * is `O(size³)` per iteration.
 *
 * @param size - The matrix dimension.
 * @param at - Reads the element at a logical row and column, whatever the
 *   contender's own storage order is.
 */
export function checksum(
	size: number,
	at: (row: number, col: number) => number,
): number {
	let total = 0;
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			total += at(row, col) * (row * size + col + 1);
		}
	}

	return total;
}

/** {@link checksum} over a vector, weighted the same way. */
export function vectorChecksum(
	size: number,
	at: (index: number) => number,
): number {
	let total = 0;
	for (let index = 0; index < size; index++) {
		total += at(index) * (index + 1);
	}

	return total;
}

/** Reference row-major product, used to derive the expected checksum. */
export function multiplyReference(
	a: FlatMatrix,
	b: FlatMatrix,
	size: number,
): number[] {
	const out: number[] = Array.from({ length: size * size }, () => 0);
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			let sum = 0;
			for (let k = 0; k < size; k++) {
				sum += a[row * size + k]! * b[k * size + col]!;
			}
			out[row * size + col] = sum;
		}
	}

	return out;
}

/** Reference row-major matrix-vector product. */
export function transformReference(
	matrix: FlatMatrix,
	vector: FlatMatrix,
	size: number,
): number[] {
	const out: number[] = Array.from({ length: size }, () => 0);
	for (let row = 0; row < size; row++) {
		let sum = 0;
		for (let col = 0; col < size; col++) {
			sum += matrix[row * size + col]! * vector[col]!;
		}
		out[row] = sum;
	}

	return out;
}

/**
 * Relative tolerance for a contender whose elements are `Float32Array`. Chosen
 * per size because a 256×256 elimination accumulates far more rounding than a
 * 4×4 cofactor expansion does.
 */
export function float32Tolerance(size: number): number {
	return size <= 4 ? 1e-5 : 1e-3;
}

/** Relative tolerance for a `Float64Array` or plain-`number[]` contender. */
export function float64Tolerance(size: number): number {
	return size <= 4 ? 1e-12 : 1e-9;
}

/**
 * For the operations that divide — inversion and determinant — where cofactor
 * expansion and LU elimination legitimately disagree in the last bits.
 * Multiply, transpose and matrix-vector stay exact on {@link dyadicMatrix} data
 * and use `assert.strictEqual` instead.
 */
export function assertClose(
	actual: number,
	wanted: number,
	relTol: number,
): void {
	assert.ok(
		isCloseTo(actual, wanted, { relTol }),
		`expected ${actual} to be within ${relTol} of ${wanted}`,
	);
}
