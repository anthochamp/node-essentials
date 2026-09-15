import type { RandomFn } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { mulberry32 } from "./mulberry32.js";
import { pcg32 } from "./pcg32.js";
import { sfc32 } from "./sfc32.js";
import { splitmix64 } from "./splitmix64.js";
import { xorshift32 } from "./xorshift32.js";
import { xoshiro128p } from "./xoshiro128p.js";
import { xoshiro256p } from "./xoshiro256p.js";

function take(rand: RandomFn, count: number): number[] {
	return Array.from({ length: count }, () => rand());
}

const SEEDED_GENERATORS: [name: string, factory: (seed: number) => RandomFn][] =
	[
		["mulberry32", mulberry32],
		["pcg32", pcg32],
		["splitmix64", splitmix64],
		["xorshift32", xorshift32],
		["xoshiro128p", xoshiro128p],
		["xoshiro256p", xoshiro256p],
	];

describe.each(SEEDED_GENERATORS)("%s", (_name, factory) => {
	it("should produce values within [0, 1)", () => {
		const values = take(factory(12345), 1000);
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
	});

	it("should produce the same sequence for the same seed", () => {
		expect(take(factory(42), 20)).toEqual(take(factory(42), 20));
	});

	it("should produce a different sequence for a different seed", () => {
		expect(take(factory(42), 20)).not.toEqual(take(factory(43), 20));
	});

	it("should not repeat a value within a short run", () => {
		const values = take(factory(7), 1000);
		expect(new Set(values).size).toBe(values.length);
	});

	it("should have a mean close to 0.5 over a long run", () => {
		const values = take(factory(2024), 20000);
		const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
		expect(mean).toBeCloseTo(0.5, 2);
	});

	it("should distribute values evenly across ten buckets", () => {
		const buckets = Array.from({ length: 10 }, () => 0);
		const rand = factory(99);
		const sampleCount = 100000;
		for (let i = 0; i < sampleCount; i++) {
			buckets[Math.floor(rand() * 10)]!++;
		}
		const expectedPerBucket = sampleCount / 10;
		expect(
			buckets.every((count) => Math.abs(count - expectedPerBucket) < 1000),
		).toBe(true);
	});
});

// Golden sequences: any change here is a change of generated output, not a refactor.
describe("mulberry32", () => {
	it.each([
		[
			0,
			[
				0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
				0.1462021479383111, 0.46732782293111086,
			],
		],
		[
			42,
			[
				0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
				0.6697340414393693, 0.17481389874592423,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(mulberry32(seed), expected.length)).toEqual(expected);
	});
});

describe("pcg32", () => {
	it.each([
		[
			0,
			[
				0.37567067076452076, 0.9067937317304313, 0.4784972576890141,
				0.5390231623314321, 0.6812197361141443,
			],
		],
		[
			42,
			[
				0.4590308510232717, 0.056365829426795244, 0.8050794524606317,
				0.8469220853876323, 0.004562742542475462,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(pcg32(seed), expected.length)).toEqual(expected);
	});
});

describe("splitmix64", () => {
	it.each([
		[
			0,
			[
				0.8833108082136426, 0.43152799704850997, 0.026433771592597743,
				0.9708819781538285, 0.10634669156721244,
			],
		],
		[
			42,
			[
				0.7415648787718233, 0.1599103928769201, 0.27860113025513866,
				0.34419071652363753, 0.03803016854024621,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(splitmix64(seed), expected.length)).toEqual(expected);
	});
});

describe("xorshift32", () => {
	it.each([
		[
			1,
			[
				0.00006295018829405308, 0.015747428173199296, 0.6164041024167091,
				0.07161863497458398, 0.5584883580449969,
			],
		],
		[
			42,
			[
				0.002643892541527748, 0.660311977379024, 0.11095708678476512,
				0.8493769019842148, 0.8754393914714456,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(xorshift32(seed), expected.length)).toEqual(expected);
	});
});

describe("xoshiro128p", () => {
	it.each([
		[
			0,
			[
				0.49723029625602067, 0.10376015002839267, 0.5052645858377218,
				0.3290378153324127, 0.5379263658542186,
			],
		],
		[
			123456789,
			[
				0.4977644730824977, 0.11489543505012989, 0.186528988648206,
				0.6269477333407849, 0.32501663896255195,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(xoshiro128p(seed), expected.length)).toEqual(expected);
	});
});

describe("xoshiro256p", () => {
	it.each([
		[
			0,
			[
				1.1577039327193006e-10, 0.12786865236046563, 0.6288454589389301,
				0.6769360476261195, 0.6907795705589672,
			],
		],
		[
			123456789,
			[
				1.1589473825068808e-10, 0.12786865236305822, 0.10398316951021913,
				0.1472501872977653, 0.47163706354453416,
			],
		],
	])("should produce the reference sequence for seed %i", (seed, expected) => {
		expect(take(xoshiro256p(seed), expected.length)).toEqual(expected);
	});
});

describe("sfc32", () => {
	it("should produce values within [0, 1)", () => {
		const values = take(sfc32(1, 2, 3, 4), 1000);
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
	});

	it("should produce the same sequence for the same seed words", () => {
		expect(take(sfc32(1, 2, 3, 4), 20)).toEqual(take(sfc32(1, 2, 3, 4), 20));
	});

	it("should produce a different sequence for different seed words", () => {
		expect(take(sfc32(1, 2, 3, 4), 20)).not.toEqual(
			take(sfc32(1, 2, 3, 5), 20),
		);
	});

	it("should escape the all-zero seed state", () => {
		const values = take(sfc32(0, 0, 0, 0), 1000);
		expect(new Set(values).size).toBe(values.length);
	});

	it("should produce the reference sequence", () => {
		expect(take(sfc32(1, 2, 3, 4), 5)).toEqual([
			1.862645149230957e-9, 8.149072527885437e-9, 0.013183618430048227,
			0.048372122226282954, 0.8077097444329411,
		]);
	});
});
