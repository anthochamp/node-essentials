import { parseModule } from "@ac-kit/format-asn1-notation";
import { cstToAst } from "@ac-kit/format-asn1-notation";
import { printModule } from "@ac-kit/format-asn1-notation";
import { describe, it, expect } from "vitest";

import {
	SIMPLE_SEQUENCE_MODULE,
	X501_NAME_MODULE,
	SUBJECT_PUBLIC_KEY_INFO_MODULE,
} from "./__fixtures__/modules.js";
import { compileModules, decompileModules } from "./index.js";

function parseAndCompile(src: string) {
	const { cst, errors: parseErrors } = parseModule(src);
	const ast = cstToAst(cst);
	const { defs, errors } = compileModules([ast]);
	return { defs, errors, ast, parseErrors };
}

describe("compileModules — simple module", () => {
	it("compiles without errors", () => {
		const { errors, parseErrors } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		expect(parseErrors).toHaveLength(0);
		expect(errors).toHaveLength(0);
	});

	it("produces a def for each type assignment", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const moduleDefs = defs.get("SimpleTest");
		expect(moduleDefs).toBeDefined();
		expect(moduleDefs?.has("Version")).toBe(true);
		expect(moduleDefs?.has("Validity")).toBe(true);
		expect(moduleDefs?.has("Time")).toBe(true);
	});

	it("lowers INTEGER to integer def", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const version = defs.get("SimpleTest")?.get("CertificateSerialNumber");
		expect(version?.kind).toBe("integer");
	});

	it("lowers INTEGER with named numbers", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const version = defs.get("SimpleTest")?.get("Version");
		expect(version?.kind).toBe("integer");
		const intDef = version as any;
		expect(intDef.namedNumbers).toHaveLength(3);
		expect(intDef.namedNumbers[0]).toMatchObject({ name: "v1", value: 0n });
	});

	it("lowers SEQUENCE to sequence def", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const validity = defs.get("SimpleTest")?.get("Validity");
		expect(validity?.kind).toBe("sequence");
		const seqDef = validity as any;
		expect(seqDef.components).toHaveLength(2);
	});

	it("lowers CHOICE to choice def", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const time = defs.get("SimpleTest")?.get("Time");
		expect(time?.kind).toBe("choice");
	});
});

describe("compileModules — X.501 Name module", () => {
	it("compiles without errors", () => {
		const { errors, parseErrors } = parseAndCompile(X501_NAME_MODULE);
		expect(parseErrors).toHaveLength(0);
		expect(errors).toHaveLength(0);
	});

	it("lowers SEQUENCE OF to sequenceOf def", () => {
		const { defs } = parseAndCompile(X501_NAME_MODULE);
		const rdnSeq = defs.get("InformationFramework")?.get("RDNSequence");
		expect(rdnSeq?.kind).toBe("sequenceOf");
	});

	it("lowers SET SIZE OF to setOf def", () => {
		const { defs } = parseAndCompile(X501_NAME_MODULE);
		const rdn = defs
			.get("InformationFramework")
			?.get("RelativeDistinguishedName");
		expect(rdn?.kind).toBe("setOf");
	});

	it("lowers OBJECT IDENTIFIER type reference to lazy def", () => {
		const { defs } = parseAndCompile(X501_NAME_MODULE);
		const attrType = defs.get("InformationFramework")?.get("AttributeType");
		expect(attrType?.kind).toBe("objectIdentifier");
	});
});

describe("compileModules — X.509 SubjectPublicKeyInfo", () => {
	it("compiles without errors", () => {
		const { errors, parseErrors } = parseAndCompile(
			SUBJECT_PUBLIC_KEY_INFO_MODULE,
		);
		expect(parseErrors).toHaveLength(0);
		expect(errors).toHaveLength(0);
	});

	it("lowers Certificate to sequence def", () => {
		const { defs } = parseAndCompile(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const cert = defs.get("PKIX1Explicit88")?.get("Certificate");
		expect(cert?.kind).toBe("sequence");
		expect((cert as any).components).toHaveLength(3);
	});

	it("lowers AlgorithmIdentifier with OPTIONAL field", () => {
		const { defs } = parseAndCompile(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const ai = defs.get("PKIX1Explicit88")?.get("AlgorithmIdentifier");
		expect(ai?.kind).toBe("sequence");
		const seqDef = ai as any;
		const params = seqDef.components.find((c: any) => c.name === "parameters");
		expect(params?.optional).toBe(true);
	});

	it("lowers tagged types with correct tag numbers", () => {
		const { defs } = parseAndCompile(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const tbs = defs.get("PKIX1Explicit88")?.get("TBSCertificate");
		expect(tbs?.kind).toBe("sequence");
		const seqDef = tbs as any;
		const versionComp = seqDef.components[0];
		expect(versionComp?.type.kind).toBe("tagged");
		expect(versionComp?.type.tag.tagNumber).toBe(0);
		expect(versionComp?.type.mode).toBe("explicit");
	});
});

describe("decompileModules — round-trip", () => {
	it("simple module round-trips through compile → decompile → print → parse", () => {
		const { defs, parseErrors } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		expect(parseErrors).toHaveLength(0);

		const astModules = decompileModules(defs);
		expect(astModules).toHaveLength(1);

		const printed = printModule(astModules[0]!);
		const { cst: reparsed, errors: reparseErrors } = parseModule(printed);
		expect(reparseErrors).toHaveLength(0);
		expect(reparsed.moduleIdentifier.name.text).toBe("SimpleTest");
	});

	it("decompile produces an AstModule with all assignments", () => {
		const { defs } = parseAndCompile(SIMPLE_SEQUENCE_MODULE);
		const astModules = decompileModules(defs);
		const names = astModules[0]!.assignments.map((a) => a.name);
		expect(names).toContain("Version");
		expect(names).toContain("Validity");
		expect(names).toContain("Time");
	});

	it("X.509 round-trip produces valid parseable ASN.1", () => {
		const { defs } = parseAndCompile(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const astModules = decompileModules(defs);
		const printed = printModule(astModules[0]!);

		const { cst: reparsed, errors } = parseModule(printed);
		expect(errors).toHaveLength(0);
		const certAssignment = reparsed.body.assignments.find(
			(a) => a.name.text === "Certificate",
		);
		expect(certAssignment).toBeDefined();
	});
});

describe("permitted alphabet constraints", () => {
	function alphabetOf(source: string): string | undefined {
		const { defs } = parseAndCompile(source);
		const def = defs.get("AlphaTest")?.get("Code") as
			| { constraints?: readonly { kind: string; alphabet?: string }[] }
			| undefined;
		return def?.constraints?.find((c) => c.kind === "permittedAlphabet")
			?.alphabet;
	}

	// The runtime tests membership with `alphabet.includes(ch)`, so a range has
	// to be expanded — a literal "a-z" would admit only `a`, `-` and `z`.
	it("expands a character range into every character it admits", () => {
		expect(
			alphabetOf(`AlphaTest DEFINITIONS ::= BEGIN
  Code ::= IA5String (FROM ("a".."f"))
END`),
		).toBe("abcdef");
	});

	it("uses the named range, not a fixed a-z guess", () => {
		expect(
			alphabetOf(`AlphaTest DEFINITIONS ::= BEGIN
  Code ::= IA5String (FROM ("0".."9"))
END`),
		).toBe("0123456789");
	});

	it("keeps a single-value alphabet whole", () => {
		expect(
			alphabetOf(`AlphaTest DEFINITIONS ::= BEGIN
  Code ::= IA5String (FROM ("abc"))
END`),
		).toBe("abc");
	});
});
