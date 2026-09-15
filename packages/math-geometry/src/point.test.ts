import { expectCompareAgreesWithEquals } from "@ac-kit/test-util";
import { describe, expect, it } from "vitest";

import { geometryConfig } from "./globals.js";
import {
	point2CompareLexicographic,
	point2Equals,
	point2IsClose,
	type Point2,
} from "./point2.js";
import {
	point3CompareLexicographic,
	point3Equals,
	point3IsClose,
	type Point3,
} from "./point3.js";

const POINTS_2: readonly Point2[] = [
	{ x: 0, y: 0 },
	{ x: -0, y: 0 },
	{ x: 0, y: 1 },
	{ x: 1, y: 0 },
	{ x: 1, y: 1 },
	{ x: -1, y: 2 },
	{ x: 1, y: 1 + Number.EPSILON },
];

const POINTS_3: readonly Point3[] = [
	{ x: 0, y: 0, z: 0 },
	{ x: 0, y: 0, z: 1 },
	{ x: 0, y: 1, z: 0 },
	{ x: 1, y: 0, z: 0 },
	{ x: -1, y: 2, z: 3 },
	{ x: 1, y: 0, z: Number.EPSILON },
];

describe("point2Equals", () => {
	it("is exact — a one-ULP difference is not equal", () => {
		expect(point2Equals({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(true);
		expect(point2Equals({ x: 1, y: 1 }, { x: 1, y: 1 + Number.EPSILON })).toBe(
			false,
		);
	});

	it("treats -0 and +0 as equal, matching `===`", () => {
		expect(point2Equals({ x: -0, y: 0 }, { x: 0, y: -0 })).toBe(true);
	});
});

describe("point2IsClose", () => {
	it("accepts a difference within the tolerance", () => {
		expect(point2IsClose({ x: 1, y: 1 }, { x: 1, y: 1 + 1e-12 }, 1e-9)).toBe(
			true,
		);
		expect(point2IsClose({ x: 1, y: 1 }, { x: 1, y: 1.5 }, 1e-9)).toBe(false);
	});

	it("holds at the origin, where a relative bound would not", () => {
		expect(point2IsClose({ x: 0, y: 0 }, { x: 1e-12, y: 0 }, 1e-9)).toBe(true);
	});

	it("falls back to the configured linear tolerance", () => {
		const previous = geometryConfig.defaultLinearTolerance;
		try {
			geometryConfig.defaultLinearTolerance = 0.5;
			expect(point2IsClose({ x: 0, y: 0 }, { x: 0.25, y: 0 })).toBe(true);
		} finally {
			geometryConfig.defaultLinearTolerance = previous;
		}
	});

	it("is not transitive, which is why it cannot back an ordering", () => {
		const a: Point2 = { x: 0, y: 0 };
		const b: Point2 = { x: 0.6, y: 0 };
		const c: Point2 = { x: 1.2, y: 0 };

		expect(point2IsClose(a, b, 1)).toBe(true);
		expect(point2IsClose(b, c, 1)).toBe(true);
		expect(point2IsClose(a, c, 1)).toBe(false);
	});
});

describe("point2CompareLexicographic", () => {
	it("orders by x, then y", () => {
		expect(point2CompareLexicographic({ x: 0, y: 9 }, { x: 1, y: 0 })).toBe(-1);
		expect(point2CompareLexicographic({ x: 1, y: 0 }, { x: 1, y: 9 })).toBe(-1);
		expect(point2CompareLexicographic({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
	});

	it("sorts into the canonical hull-scan order", () => {
		const sorted = [
			{ x: 1, y: 2 },
			{ x: 0, y: 5 },
			{ x: 1, y: 0 },
		].toSorted(point2CompareLexicographic);

		expect(sorted).toEqual([
			{ x: 0, y: 5 },
			{ x: 1, y: 0 },
			{ x: 1, y: 2 },
		]);
	});

	it("agrees with point2Equals", () => {
		expectCompareAgreesWithEquals(
			POINTS_2,
			point2CompareLexicographic,
			point2Equals,
		);
	});
});

describe("point3CompareLexicographic", () => {
	it("orders by x, then y, then z", () => {
		expect(
			point3CompareLexicographic({ x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }),
		).toBe(-1);
		expect(
			point3CompareLexicographic({ x: 1, y: 2, z: 0 }, { x: 1, y: 1, z: 9 }),
		).toBe(1);
	});

	it("agrees with point3Equals", () => {
		expectCompareAgreesWithEquals(
			POINTS_3,
			point3CompareLexicographic,
			point3Equals,
		);
	});
});

describe("point3IsClose", () => {
	it("accepts a difference within the tolerance on every axis", () => {
		expect(
			point3IsClose({ x: 0, y: 0, z: 0 }, { x: 1e-12, y: 0, z: -1e-12 }, 1e-9),
		).toBe(true);
		expect(
			point3IsClose({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 1e-9),
		).toBe(false);
	});
});
