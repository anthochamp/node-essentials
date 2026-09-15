import { describe, expect, it } from "vitest";

import {
	allOfPolicies,
	anyOfPolicies,
	createProjectedPolicy,
} from "./policy-combinators.js";
import { StoppingDecision, StoppingPolicy } from "./sampler.js";

/** A policy satisfied once `at` samples have been taken. */
function createPolicyAfter_(
	at: number,
	label: string,
	suggestedSamples?: number,
): StoppingPolicy<number, Record<string, number>> {
	return {
		pilotSamples: 1,
		evaluate: (samples): StoppingDecision =>
			samples.length >= at
				? { kind: "satisfied" }
				: {
						kind: "continue",
						...(suggestedSamples === undefined ? {} : { suggestedSamples }),
					},
		describe: (samples) => ({ [label]: samples.length }),
	};
}

describe("createProjectedPolicy", () => {
	/** Satisfied once the projected values sum past `total`. */
	function createSumPolicy_(
		total: number,
	): StoppingPolicy<number, { sum: number }> {
		const sum = (samples: readonly number[]) =>
			samples.reduce((running, value) => running + value, 0);

		return {
			pilotSamples: 2,
			evaluate: (samples): StoppingDecision =>
				sum(samples) >= total ? { kind: "satisfied" } : { kind: "continue" },
			describe: (samples) => ({ sum: sum(samples) }),
		};
	}

	it("should judge a record sample by the projected quantity", () => {
		const policy = createProjectedPolicy(
			(sample: { bytes: number }) => sample.bytes,
			createSumPolicy_(10),
		);

		expect(policy.evaluate([{ bytes: 4 }, { bytes: 5 }]).kind).toBe("continue");
		expect(policy.evaluate([{ bytes: 4 }, { bytes: 6 }]).kind).toBe(
			"satisfied",
		);
	});

	it("should keep the inner policy's pilot and metadata", () => {
		const policy = createProjectedPolicy(
			(sample: { bytes: number }) => sample.bytes,
			createSumPolicy_(10),
		);

		expect(policy.pilotSamples).toBe(2);
		expect(policy.describe([{ bytes: 4 }, { bytes: 5 }])).toEqual({ sum: 9 });
	});

	it("should compose with allOfPolicies over one record sample type", () => {
		type Sample = { bytes: number; ms: number };

		const policy = allOfPolicies([
			createProjectedPolicy((s: Sample) => s.bytes, createSumPolicy_(10)),
			createProjectedPolicy((s: Sample) => s.ms, createSumPolicy_(100)),
		]);

		expect(policy.evaluate([{ bytes: 20, ms: 10 }]).kind).toBe("continue");
		expect(policy.evaluate([{ bytes: 20, ms: 200 }]).kind).toBe("satisfied");
	});
});

describe("allOfPolicies", () => {
	it("should continue while any member is unsatisfied", () => {
		const policy = allOfPolicies([
			createPolicyAfter_(2, "a"),
			createPolicyAfter_(9, "b"),
		]);

		expect(policy.evaluate([1, 2, 3]).kind).toBe("continue");
	});

	it("should be satisfied only once every member is", () => {
		const policy = allOfPolicies([
			createPolicyAfter_(2, "a"),
			createPolicyAfter_(3, "b"),
		]);

		expect(policy.evaluate([1, 2, 3]).kind).toBe("satisfied");
	});

	it("should take the largest pilot, since every member must be able to judge", () => {
		const policy = allOfPolicies([
			{ ...createPolicyAfter_(1, "a"), pilotSamples: 4 },
			{ ...createPolicyAfter_(1, "b"), pilotSamples: 20 },
		]);

		expect(policy.pilotSamples).toBe(20);
	});

	it("should ask for the most demanding member's suggestion", () => {
		const policy = allOfPolicies([
			createPolicyAfter_(9, "a", 5),
			createPolicyAfter_(9, "b", 40),
		]);

		expect(policy.evaluate([1])).toEqual({
			kind: "continue",
			suggestedSamples: 40,
		});
	});

	it("should merge every member's metadata", () => {
		const policy = allOfPolicies([
			createPolicyAfter_(1, "a"),
			createPolicyAfter_(1, "b"),
		]);

		expect(policy.describe([1, 2])).toEqual({ a: 2, b: 2 });
	});
});

describe("anyOfPolicies", () => {
	it("should be satisfied as soon as one member is", () => {
		const policy = anyOfPolicies([
			createPolicyAfter_(2, "a"),
			createPolicyAfter_(90, "b"),
		]);

		expect(policy.evaluate([1, 2]).kind).toBe("satisfied");
	});

	it("should continue while every member is unsatisfied", () => {
		const policy = anyOfPolicies([
			createPolicyAfter_(9, "a"),
			createPolicyAfter_(90, "b"),
		]);

		expect(policy.evaluate([1, 2]).kind).toBe("continue");
	});

	it("should take the smallest pilot, since the first to settle answers", () => {
		const policy = anyOfPolicies([
			{ ...createPolicyAfter_(1, "a"), pilotSamples: 4 },
			{ ...createPolicyAfter_(1, "b"), pilotSamples: 20 },
		]);

		expect(policy.pilotSamples).toBe(4);
	});

	it("should ask for the least demanding member's suggestion", () => {
		const policy = anyOfPolicies([
			createPolicyAfter_(9, "a", 5),
			createPolicyAfter_(9, "b", 40),
		]);

		expect(policy.evaluate([1])).toEqual({
			kind: "continue",
			suggestedSamples: 5,
		});
	});

	it("should merge every member's metadata", () => {
		const policy = anyOfPolicies([
			createPolicyAfter_(1, "a"),
			createPolicyAfter_(1, "b"),
		]);

		expect(policy.describe([1, 2, 3])).toEqual({ a: 3, b: 3 });
	});
});
