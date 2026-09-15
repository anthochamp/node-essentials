import { describe, expect, it } from "vitest";

import { ref } from "./types/base.js";
import { component } from "./types/constructed/component.js";
import { sequenceOf } from "./types/constructed/sequence-of.js";
import { sequence } from "./types/constructed/sequence.js";
import { paramRef } from "./types/parameterized/parameterized-type.js";
import { integer } from "./types/primitives/integer.js";
import { utf8String } from "./types/strings/utf8-string.js";
import { checkValueConstraint, validateSchema } from "./validate.js";

describe("validateSchema()", () => {
	it("returns valid for a simple schema", () => {
		const result = validateSchema(ref(integer()));
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("detects duplicate component names in SEQUENCE", () => {
		const s = sequence([
			component("id", integer()),
			component("id", utf8String()),
		] as const);
		const result = validateSchema(ref(s));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes("id"))).toBe(true);
	});

	it("detects min > max in valueRange constraint", () => {
		const s = integer().range(100, 10);
		const result = validateSchema(ref(s));
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toMatch(/min.*>.*max/i);
	});

	it("detects min > max in size constraint", () => {
		const s = utf8String().size(50, 1);
		const result = validateSchema(ref(s));
		expect(result.valid).toBe(false);
	});

	it("reports paramRef as invalid at top level", () => {
		const pr = paramRef("T");
		const result = validateSchema(ref(pr));
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toMatch(/parameterized/i);
	});

	it("validates nested defs via walk", () => {
		const s = sequence([component("count", integer().range(10, 5))] as const);
		const result = validateSchema(ref(s));
		expect(result.valid).toBe(false);
	});
});

describe("checkValueConstraint()", () => {
	it("passes when no constraints", () => {
		const result = checkValueConstraint(ref(integer()), 42n);
		expect(result.ok).toBe(true);
	});

	it("passes when value is within range", () => {
		const result = checkValueConstraint(ref(integer().range(0, 255)), 100n);
		expect(result.ok).toBe(true);
	});

	it("fails when value is below min", () => {
		const result = checkValueConstraint(ref(integer().range(0, 255)), -1n);
		expect(result.ok).toBe(false);
		expect(result.violations[0]?.message).toMatch(/< min/i);
	});

	it("fails when value is above max", () => {
		const result = checkValueConstraint(ref(integer().range(0, 255)), 256n);
		expect(result.ok).toBe(false);
		expect(result.violations[0]?.message).toMatch(/> max/i);
	});

	it("checks size constraint on string", () => {
		const result = checkValueConstraint(
			ref(utf8String().size(1, 5)),
			"toolongstring",
		);
		expect(result.ok).toBe(false);
	});

	it("passes size constraint when string length is within bounds", () => {
		const result = checkValueConstraint(ref(utf8String().size(1, 10)), "hello");
		expect(result.ok).toBe(true);
	});

	it("checks size constraint on array", () => {
		const result = checkValueConstraint(ref(sequenceOf(integer()).size(1, 3)), [
			1n,
			2n,
			3n,
			4n,
		] as readonly bigint[]);
		expect(result.ok).toBe(false);
	});

	it("checks permittedAlphabet constraint", () => {
		const result = checkValueConstraint(
			ref(utf8String().alphabet("abc")),
			"xyz",
		);
		expect(result.ok).toBe(false);
	});

	it("passes permittedAlphabet when all chars allowed", () => {
		const result = checkValueConstraint(
			ref(utf8String().alphabet("abc")),
			"abc",
		);
		expect(result.ok).toBe(true);
	});
});
