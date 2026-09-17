import { describe, expect, it } from "vitest";

import {
	DEFAULT_REGEX_LIMITS,
	RegexLimitExceededError,
	regexLimits,
} from "./limits.js";
import { compileRegex } from "./regex.js";

describe("regexLimits", () => {
	it("fills unset bounds from the defaults", () => {
		expect(regexLimits()).toStrictEqual(DEFAULT_REGEX_LIMITS);
		expect(regexLimits({ maxSteps: 5 })).toStrictEqual({
			maxProgramSize: DEFAULT_REGEX_LIMITS.maxProgramSize,
			maxSteps: 5,
		});
	});
});

describe("maxProgramSize", () => {
	it("rejects a counted quantifier that outgrows the bound", () => {
		expect(() => compileRegex("a{1,100}", { maxProgramSize: 16 })).toThrow(
			RegexLimitExceededError,
		);
	});

	it("reports which bound was hit", () => {
		try {
			compileRegex("a{1,100}", { maxProgramSize: 16 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(RegexLimitExceededError);
			expect((error as RegexLimitExceededError).kind).toBe("programSize");
			expect((error as RegexLimitExceededError).limit).toBe(16);
		}
	});

	it("accepts a pattern that fits", () => {
		expect(compileRegex("a{1,3}", { maxProgramSize: 64 }).test("aa")).toBe(
			true,
		);
	});

	it("does not reach the default bound for an ordinary pattern", () => {
		expect(compileRegex("(\\d+)-(\\d+)").test("10-20")).toBe(true);
	});
});

describe("maxSteps", () => {
	it("rejects a run that outgrows the bound", () => {
		const re = compileRegex("(a+)+b", { maxSteps: 64 });
		expect(() => re.test("a".repeat(1000))).toThrow(RegexLimitExceededError);
	});

	it("reports which bound was hit", () => {
		const re = compileRegex("a*b", { maxSteps: 8 });
		try {
			re.test("a".repeat(1000));
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as RegexLimitExceededError).kind).toBe("steps");
			expect((error as RegexLimitExceededError).limit).toBe(8);
		}
	});

	it("leaves a run inside the bound alone", () => {
		expect(compileRegex("a*b", { maxSteps: 1_000 }).test("aaab")).toBe(true);
	});

	it("does not reach the default bound on the ReDoS witness", () => {
		// The point of the Pike VM: linear, so the default budget is never close.
		const re = compileRegex("(a+)+b");
		expect(re.test("a".repeat(2_000))).toBe(false);
	});
});
