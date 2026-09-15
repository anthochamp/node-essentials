import { describe, expect, it } from "vitest";

import { ref } from "../types/base.js";
import { checkValueConstraint, validateSchema } from "../validate.js";
import { AlgorithmIdentifier, PkixModule } from "./algorithm-identifier.js";

describe("AlgorithmIdentifier fixture", () => {
	it("has kind 'sequence'", () => {
		expect(ref(AlgorithmIdentifier).kind).toBe("sequence");
	});

	it("has two components", () => {
		expect(ref(AlgorithmIdentifier).components).toHaveLength(2);
	});

	it("first component is 'algorithm' of kind 'objectIdentifier'", () => {
		const comp = ref(AlgorithmIdentifier).components[0] as any;
		expect(comp.name).toBe("algorithm");
		expect(comp.type.kind).toBe("objectIdentifier");
		expect(comp.optional).toBe(false);
	});

	it("second component is 'parameters' of kind 'any' and is OPTIONAL", () => {
		const comp = ref(AlgorithmIdentifier).components[1] as any;
		expect(comp.name).toBe("parameters");
		expect(comp.type.kind).toBe("any");
		expect(comp.optional).toBe(true);
	});

	it("passes schema validation", () => {
		const result = validateSchema(ref(AlgorithmIdentifier));
		expect(result.valid).toBe(true);
	});

	it("passes constraint check for a valid value", () => {
		const value = { algorithm: [1, 2, 840, 113549, 1, 1, 11] };
		const result = checkValueConstraint(ref(AlgorithmIdentifier), value);
		expect(result.ok).toBe(true);
	});
});

describe("PKIXModule fixture", () => {
	it("has the correct module name", () => {
		expect(PkixModule.def.name).toBe("PKIX1Explicit88");
	});

	it("exports AlgorithmIdentifier", () => {
		expect(PkixModule.processedTypes["AlgorithmIdentifier"]).toBeDefined();
		expect(PkixModule.processedTypes["AlgorithmIdentifier"]?.kind).toBe(
			"sequence",
		);
	});
});
