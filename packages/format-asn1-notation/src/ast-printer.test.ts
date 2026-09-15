import { describe, it, expect } from "vitest";

import {
	SIMPLE_SEQUENCE_MODULE,
	SUBJECT_PUBLIC_KEY_INFO_MODULE,
} from "./__fixtures__/modules.js";
import { printModule } from "./index.js";
import { parseModule, type ParseResult } from "./index.js";
import { cstToAst } from "./index.js";

function roundtrip(src: string): {
	ast: ReturnType<typeof cstToAst>;
	printed: string;
	errors: ParseResult["errors"];
} {
	const { cst, errors } = parseModule(src);
	const ast = cstToAst(cst);
	const printed = printModule(ast);
	return { ast, printed, errors };
}

describe("printModule — basic structure", () => {
	it("emits module name and BEGIN/END", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("SimpleTest");
		expect(printed).toContain("BEGIN");
		expect(printed).toContain("END");
	});

	it("emits DEFINITIONS EXPLICIT TAGS", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("DEFINITIONS EXPLICIT TAGS ::=");
	});

	it("emits type assignments", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("Version ::=");
		expect(printed).toContain("Validity ::=");
		expect(printed).toContain("Time ::=");
	});

	it("emits INTEGER with named numbers", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("INTEGER");
		expect(printed).toContain("v1(0)");
		expect(printed).toContain("v2(1)");
	});

	it("emits SEQUENCE with components", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("SEQUENCE");
		expect(printed).toContain("notBefore");
		expect(printed).toContain("notAfter");
	});

	it("emits CHOICE alternatives", () => {
		const { printed } = roundtrip(SIMPLE_SEQUENCE_MODULE);
		expect(printed).toContain("CHOICE");
		expect(printed).toContain("utcTime");
		expect(printed).toContain("generalTime");
	});
});

describe("printModule — X.509 SubjectPublicKeyInfo", () => {
	it("produces parseable output (round-trip)", () => {
		const { printed: once } = roundtrip(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		// Parse the output again and re-print — should be stable
		const { printed: twice, errors } = roundtrip(once);
		expect(errors).toHaveLength(0);
		expect(twice).toContain("Certificate");
		expect(twice).toContain("TBSCertificate");
		expect(twice).toContain("AlgorithmIdentifier");
	});

	it("emits OBJECT IDENTIFIER", () => {
		const { printed } = roundtrip(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		expect(printed).toContain("OBJECT IDENTIFIER");
	});

	it("emits BIT STRING", () => {
		const { printed } = roundtrip(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		expect(printed).toContain("BIT STRING");
	});

	it("emits tagged types with tag numbers", () => {
		const { printed } = roundtrip(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		// [0] EXPLICIT version field
		expect(printed).toMatch(/\[0\]/);
	});

	it("emits OPTIONAL fields", () => {
		const { printed } = roundtrip(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		expect(printed).toContain("OPTIONAL");
	});
});
