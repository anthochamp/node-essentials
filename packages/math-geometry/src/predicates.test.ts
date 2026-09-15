import { describe, expect, it } from "vitest";

import { circle2ContainsPoint, circle2Intersects } from "./circle2.js";
import { geometryConfig } from "./globals.js";
import { line2Intersect } from "./line2.js";
import { plane3ContainsPoint } from "./plane3.js";
import { segment2Intersect } from "./segment2.js";
import { size2IsZero } from "./size2.js";

describe("circle2ContainsPoint", () => {
	const unit = { center: { x: 0, y: 0 }, radius: 1 };

	it("includes the interior and the boundary", () => {
		expect(circle2ContainsPoint(unit, { x: 0, y: 0 })).toBe(true);
		expect(circle2ContainsPoint(unit, { x: 1, y: 0 })).toBe(true);
	});

	it("excludes the exterior", () => {
		expect(circle2ContainsPoint(unit, { x: 1.5, y: 0 })).toBe(false);
	});

	it("takes slack from an inflated radius, not from a tolerance", () => {
		expect(circle2ContainsPoint(unit, { x: 1.25, y: 0 })).toBe(false);
		expect(
			circle2ContainsPoint(
				{ ...unit, radius: unit.radius + 0.5 },
				{
					x: 1.25,
					y: 0,
				},
			),
		).toBe(true);
	});
});

describe("circle2Intersects", () => {
	it("includes tangency and excludes separation", () => {
		const a = { center: { x: 0, y: 0 }, radius: 1 };

		expect(circle2Intersects(a, { center: { x: 2, y: 0 }, radius: 1 })).toBe(
			true,
		);
		expect(circle2Intersects(a, { center: { x: 3, y: 0 }, radius: 1 })).toBe(
			false,
		);
	});
});

describe("line2Intersect", () => {
	it("finds the crossing of two non-parallel lines", () => {
		const result = line2Intersect(
			{ point: { x: 0, y: 0 }, direction: [1, 0] },
			{ point: { x: 2, y: -1 }, direction: [0, 1] },
		);

		expect(result).toEqual({ x: 2, y: 0 });
	});

	it("returns null for parallel lines", () => {
		expect(
			line2Intersect(
				{ point: { x: 0, y: 0 }, direction: [1, 0] },
				{ point: { x: 0, y: 1 }, direction: [1, 0] },
			),
		).toBeNull();
	});

	it("returns null rather than dividing by a near-zero denominator", () => {
		const result = line2Intersect(
			{ point: { x: 0, y: 0 }, direction: [1, 0] },
			{ point: { x: 0, y: 1 }, direction: [1, 1e-300] },
		);

		expect(result).toBeNull();
	});

	it("is unaffected by how the directions are scaled", () => {
		const a = { point: { x: 0, y: 0 }, direction: [1, 0] as [number, number] };
		const b = {
			point: { x: 2, y: -1 },
			direction: [0, 1] as [number, number],
		};
		const scaled = {
			point: b.point,
			direction: [0, 1e6] as [number, number],
		};

		expect(line2Intersect(a, scaled)).toEqual(line2Intersect(a, b));
	});
});

describe("segment2Intersect", () => {
	it("finds a crossing inside both segments", () => {
		const result = segment2Intersect(
			{ a: { x: 0, y: 0 }, b: { x: 2, y: 0 } },
			{ a: { x: 1, y: -1 }, b: { x: 1, y: 1 } },
		);

		expect(result).toEqual({ x: 1, y: 0 });
	});

	it("returns null for a degenerate zero-length segment", () => {
		expect(
			segment2Intersect(
				{ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
				{ a: { x: 1, y: -1 }, b: { x: 1, y: 1 } },
			),
		).toBeNull();
	});

	it("agrees with line2Intersect on the parallel verdict", () => {
		const parallel = segment2Intersect(
			{ a: { x: 0, y: 0 }, b: { x: 2, y: 0 } },
			{ a: { x: 0, y: 1 }, b: { x: 2, y: 1 } },
		);

		expect(parallel).toBeNull();
	});
});

describe("plane3ContainsPoint", () => {
	const xy = { normal: [0, 0, 1] as [number, number, number], distance: 0 };

	it("accepts a point a hair off the plane", () => {
		expect(plane3ContainsPoint(xy, [3, 4, 1e-12])).toBe(true);
	});

	it("rejects a point clearly off the plane", () => {
		expect(plane3ContainsPoint(xy, [3, 4, 1])).toBe(false);
	});

	it("honours an explicit tolerance", () => {
		expect(plane3ContainsPoint(xy, [0, 0, 0.25], 0.5)).toBe(true);
		expect(plane3ContainsPoint(xy, [0, 0, 0.25], 0.1)).toBe(false);
	});
});

describe("size2IsZero", () => {
	it("accepts a size that is merely near zero", () => {
		expect(size2IsZero({ width: 1e-12, height: 0 })).toBe(true);
	});

	it("rejects a size at the configured tolerance's scale", () => {
		expect(
			size2IsZero({
				width: geometryConfig.defaultLinearTolerance * 10,
				height: 0,
			}),
		).toBe(false);
	});
});
