import { describe, expect, it } from "vitest";

import { mat3x3Equals, mat3x3IsClose, type Mat3x3 } from "./mat3x3.js";
import { vec2Equals, vec2IsClose } from "./vec2.js";
import { vec3IsClose } from "./vec3.js";

describe("vec2Equals", () => {
	it("is exact — a one-ULP difference is not equal", () => {
		expect(vec2Equals([1, 2], [1, 2])).toBe(true);
		expect(vec2Equals([1, 2], [1, 2 + Number.EPSILON * 2])).toBe(false);
	});

	it("treats -0 and +0 as equal, matching `===`", () => {
		expect(vec2Equals([-0, 0], [0, -0])).toBe(true);
	});
});

describe("vec2IsClose", () => {
	it("accepts a difference within an absolute bound", () => {
		expect(vec2IsClose([1, 2], [1, 2 + 1e-12], { absTol: 1e-9 })).toBe(true);
		expect(vec2IsClose([1, 2], [1, 2.5], { absTol: 1e-9 })).toBe(false);
	});

	it("accepts a difference within a relative bound", () => {
		expect(vec2IsClose([1e12, 0], [1e12 + 1, 0], { relTol: 1e-9 })).toBe(true);
	});

	it("requires an explicit tolerance — an empty one means exact", () => {
		expect(vec2IsClose([1, 2], [1, 2 + Number.EPSILON * 2], {})).toBe(false);
	});
});

describe("vec3IsClose", () => {
	it("checks every component", () => {
		expect(vec3IsClose([0, 0, 0], [0, 0, 1e-12], { absTol: 1e-9 })).toBe(true);
		expect(vec3IsClose([0, 0, 0], [0, 0, 1], { absTol: 1e-9 })).toBe(false);
	});
});

describe("mat3x3Equals", () => {
	const identity = (): Mat3x3 => [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
	];

	it("is exact", () => {
		expect(mat3x3Equals(identity(), identity())).toBe(true);
	});

	it("has a tolerant companion", () => {
		const drifted: Mat3x3 = [
			[1 + 1e-12, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];

		expect(mat3x3Equals(identity(), drifted)).toBe(false);
		expect(mat3x3IsClose(identity(), drifted, { absTol: 1e-9 })).toBe(true);
	});
});
