import { describe, expect, it } from "vitest";

import {
	MAT4X4_IDENTITY,
	Mat4x4,
	mat4x4Determinant,
	mat4x4FromRotationX,
	mat4x4FromScale,
	mat4x4FromTranslation,
	mat4x4Invert,
	mat4x4IsClose,
	mat4x4Multiply,
} from "./mat4x4.js";

const TOLERANCE = { absTol: 1e-9 } as const;

/** Exact equality, but with `+0` and `-0` treated as the same value. */
const EXACT = {} as const;

/** A matrix whose exact inverse has small integer entries. */
const INTEGER_MATRIX: Mat4x4 = [
	[1, 2, 0, 0],
	[0, 1, 0, 0],
	[0, 0, 1, 3],
	[0, 0, 0, 1],
];

describe("mat4x4Determinant", () => {
	it("is 1 for the identity", () => {
		expect(mat4x4Determinant(MAT4X4_IDENTITY as Mat4x4)).toBe(1);
	});

	it("is the product of the diagonal for a scale", () => {
		expect(mat4x4Determinant(mat4x4FromScale([2, 3, 4]))).toBe(24);
	});

	it("is 1 for a translation", () => {
		expect(mat4x4Determinant(mat4x4FromTranslation([5, -7, 11]))).toBe(1);
	});

	it("is 1 for a rotation", () => {
		expect(mat4x4Determinant(mat4x4FromRotationX(0.7))).toBeCloseTo(1, 12);
	});

	it("is 0 for a singular matrix", () => {
		const singular: Mat4x4 = [
			[1, 2, 3, 4],
			[2, 4, 6, 8],
			[1, 0, 1, 0],
			[0, 1, 0, 1],
		];

		expect(mat4x4Determinant(singular)).toBe(0);
	});

	it("flips sign when two rows are swapped", () => {
		const swapped: Mat4x4 = [
			INTEGER_MATRIX[1],
			INTEGER_MATRIX[0],
			INTEGER_MATRIX[2],
			INTEGER_MATRIX[3],
		];

		expect(mat4x4Determinant(swapped)).toBe(-mat4x4Determinant(INTEGER_MATRIX));
	});
});

describe("mat4x4Invert", () => {
	it("returns the identity for the identity", () => {
		expect(
			mat4x4IsClose(
				mat4x4Invert(MAT4X4_IDENTITY as Mat4x4),
				MAT4X4_IDENTITY as Mat4x4,
				EXACT,
			),
		).toBe(true);
	});

	it("returns the exact inverse of an integer matrix", () => {
		expect(
			mat4x4IsClose(
				mat4x4Invert(INTEGER_MATRIX),
				[
					[1, -2, 0, 0],
					[0, 1, 0, 0],
					[0, 0, 1, -3],
					[0, 0, 0, 1],
				],
				EXACT,
			),
		).toBe(true);
	});

	it("inverts a scale by reciprocating the diagonal", () => {
		expect(
			mat4x4IsClose(
				mat4x4Invert(mat4x4FromScale([2, 4, 8])),
				mat4x4FromScale([0.5, 0.25, 0.125]),
				EXACT,
			),
		).toBe(true);
	});

	it("inverts a translation by negating it", () => {
		expect(
			mat4x4IsClose(
				mat4x4Invert(mat4x4FromTranslation([5, -7, 11])),
				mat4x4FromTranslation([-5, 7, -11]),
				EXACT,
			),
		).toBe(true);
	});

	it("multiplies back to the identity for a composed transform", () => {
		const transform = mat4x4Multiply(
			mat4x4Multiply(
				mat4x4FromTranslation([3, -4, 5]),
				mat4x4FromRotationX(0.9),
			),
			mat4x4FromScale([2, 0.5, 3]),
		);
		const inverse = mat4x4Invert(transform);

		expect(
			mat4x4IsClose(
				mat4x4Multiply(transform, inverse),
				MAT4X4_IDENTITY as Mat4x4,
				TOLERANCE,
			),
		).toBe(true);
		expect(
			mat4x4IsClose(
				mat4x4Multiply(inverse, transform),
				MAT4X4_IDENTITY as Mat4x4,
				TOLERANCE,
			),
		).toBe(true);
	});

	it("multiplies back to the identity for an arbitrary dense matrix", () => {
		const dense: Mat4x4 = [
			[4, 7, 2, 3],
			[0, 5, 1, 6],
			[2, 1, 8, 4],
			[3, 0, 6, 9],
		];
		const inverse = mat4x4Invert(dense);

		expect(
			mat4x4IsClose(
				mat4x4Multiply(dense, inverse),
				MAT4X4_IDENTITY as Mat4x4,
				TOLERANCE,
			),
		).toBe(true);
	});

	it("round-trips back to the original matrix", () => {
		const dense: Mat4x4 = [
			[4, 7, 2, 3],
			[0, 5, 1, 6],
			[2, 1, 8, 4],
			[3, 0, 6, 9],
		];

		expect(
			mat4x4IsClose(mat4x4Invert(mat4x4Invert(dense)), dense, TOLERANCE),
		).toBe(true);
	});

	it("rejects a singular matrix", () => {
		const singular: Mat4x4 = [
			[1, 2, 3, 4],
			[2, 4, 6, 8],
			[1, 0, 1, 0],
			[0, 1, 0, 1],
		];

		expect(() => mat4x4Invert(singular)).toThrow(Error);
	});
});
