import { describe, expect, it } from "vitest";

import {
	SIMPLE_SEQUENCE_MODULE,
	SUBJECT_PUBLIC_KEY_INFO_MODULE,
	X501_NAME_MODULE,
} from "./__fixtures__/modules.js";
import {
	AnyAstAssignment,
	AstComponent,
	AstIntegerType,
	AstSequenceType,
	AstTaggedType,
	AstTypeReference,
	CstAlternativeType,
	CstAnyAssignment,
	CstBuiltinPrimitiveType,
	CstChoiceType,
	CstComponentType,
	CstReferencedType,
	CstSequenceType,
	CstTaggedType,
	cstToAst,
	parseModule,
} from "./index.js";

describe("parseModule — simple module", () => {
	it("parses module name and BEGIN/END", () => {
		const { cst, errors } = parseModule(SIMPLE_SEQUENCE_MODULE);
		expect(errors).toHaveLength(0);
		expect(cst.moduleIdentifier.name.text).toBe("SimpleTest");
	});

	it("sets EXPLICIT TAGS mode", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		expect(cst.tagDefault?.mode).toBe("explicit");
	});

	it("parses all type assignments", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const names = cst.body.assignments.map((a) => a.name.text);
		expect(names).toContain("Version");
		expect(names).toContain("CertificateSerialNumber");
		expect(names).toContain("Validity");
		expect(names).toContain("Time");
	});

	it("parses INTEGER with named numbers", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const version = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "Version",
		);
		expect(version?.type.kind).toBe("integer");
		const intType = version?.type as CstBuiltinPrimitiveType;
		expect(intType.namedValues).toHaveLength(3);
		expect(intType.namedValues?.[0]?.name.text).toBe("v1");
	});

	it("parses SEQUENCE with OPTIONAL field", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const validity = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "Validity",
		);
		expect(validity?.type.kind).toBe("sequence");
		const seq = validity?.type as CstSequenceType;
		expect(seq.components).toHaveLength(2);
	});

	it("parses CHOICE type", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const time = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "Time",
		);
		expect(time?.type.kind).toBe("choice");
		const ch = time?.type as CstChoiceType;
		expect(ch.alternatives).toHaveLength(2);
		const alt0 = ch.alternatives[0] as CstAlternativeType;
		expect(alt0.name.text).toBe("utcTime");
	});
});

describe("parseModule — X.501 Name module", () => {
	it("parses without errors", () => {
		const { errors } = parseModule(X501_NAME_MODULE);
		expect(errors).toHaveLength(0);
	});

	it("parses IMPLICIT TAGS", () => {
		const { cst } = parseModule(X501_NAME_MODULE);
		expect(cst.tagDefault?.mode).toBe("implicit");
	});

	it("parses SEQUENCE OF type", () => {
		const { cst } = parseModule(X501_NAME_MODULE);
		const rdn = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "RDNSequence",
		);
		expect(rdn?.type.kind).toBe("sequenceOf");
	});

	it("parses SET SIZE constraint", () => {
		const { cst } = parseModule(X501_NAME_MODULE);
		const rdn = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "RelativeDistinguishedName",
		);
		// SET SIZE (1..MAX) OF → setOf with size constraint
		expect(rdn?.type.kind).toBe("setOf");
	});

	it("parses OBJECT IDENTIFIER type (standalone)", () => {
		const { cst } = parseModule(X501_NAME_MODULE);
		const attrType = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "AttributeType",
		);
		expect(attrType?.type.kind).toBe("objectIdentifier");
	});
});

describe("parseModule — SubjectPublicKeyInfo (X.509 core)", () => {
	it("parses without errors", () => {
		const { errors } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		expect(errors).toHaveLength(0);
	});

	it("parses module OID", () => {
		const { cst } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		expect(cst.moduleIdentifier.oid).toBeDefined();
		expect(cst.moduleIdentifier.oid?.components.length).toBeGreaterThan(3);
	});

	it("parses Certificate SEQUENCE structure", () => {
		const { cst } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const cert = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "Certificate",
		);
		expect(cert?.type.kind).toBe("sequence");
		const seq = cert?.type as CstSequenceType;
		expect(seq.components).toHaveLength(3);
	});

	it("parses explicit tagged type [0] EXPLICIT", () => {
		const { cst } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const tbs = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "TBSCertificate",
		);
		const seq = tbs?.type as CstSequenceType;
		const version = seq?.components[0] as CstComponentType;
		expect(version?.type.kind).toBe("taggedType");
		const tagged = version?.type as CstTaggedType;
		expect(tagged.tagNumber.text).toBe("0");
		expect(tagged.mode).toBe("explicit");
	});

	it("parses implicit tagged OPTIONAL fields", () => {
		const { cst } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const tbs = cst.body.assignments.find(
			(a: CstAnyAssignment) => a.name.text === "TBSCertificate",
		);
		const seq = tbs?.type as CstSequenceType;
		const issuerUID = seq?.components[7] as CstComponentType;
		expect(issuerUID?.optional).toBe(true);
		expect(issuerUID?.type.kind).toBe("taggedType");
		const tagged = issuerUID?.type as CstTaggedType;
		expect(tagged.mode).toBe("implicit");
	});
});

describe("cstToAst — lowering", () => {
	it("produces AstModule from simple module", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const ast = cstToAst(cst);
		expect(ast.kind).toBe("module");
		expect(ast.name).toBe("SimpleTest");
		expect(ast.tagDefault).toBe("explicit");
	});

	it("lowers SEQUENCE to AstSequenceType", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const ast = cstToAst(cst);
		const validity = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "Validity",
		);
		expect(validity?.type.kind).toBe("sequence");
	});

	it("lowers INTEGER with named numbers", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const ast = cstToAst(cst);
		const version = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "Version",
		);
		expect(version?.type.kind).toBe("integer");
		const intType = version?.type as AstIntegerType;
		expect(intType.namedNumbers).toHaveLength(3);
		expect(intType.namedNumbers[0]).toEqual({ name: "v1", value: 0n });
	});

	it("lowers tagged type with tag number and class", () => {
		const { cst } = parseModule(SUBJECT_PUBLIC_KEY_INFO_MODULE);
		const ast = cstToAst(cst);
		const tbs = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "TBSCertificate",
		);
		const seq = tbs?.type as AstSequenceType;
		const version = seq?.components[0] as AstComponent;
		const tagged = version?.type as AstTaggedType;
		expect(tagged.tagNumber).toBe(0);
		expect(tagged.tagClass).toBe("context");
	});
});

describe("parameterized type instances", () => {
	const MODULE = `ParamTest DEFINITIONS ::= BEGIN
  Wrapped ::= Envelope { Payload, 3, id-alg }
END`;

	it("parses actual parameters instead of discarding them", () => {
		const { cst, errors } = parseModule(MODULE);
		expect(errors).toHaveLength(0);

		const assignment = cst.body.assignments[0] as CstAnyAssignment;
		const referenced = (assignment as { type: CstReferencedType }).type;
		expect(referenced.kind).toBe("referencedType");
		expect(referenced.actualParams).toHaveLength(3);
	});

	it("lowers a type parameter as a type and a number as a bigint", () => {
		const { cst } = parseModule(MODULE);
		const ast = cstToAst(cst);
		const wrapped = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "Wrapped",
		);
		const reference = wrapped?.type as AstTypeReference;

		expect(reference.actualParams?.[0]).toMatchObject({
			kind: "typeReference",
			name: "Payload",
		});
		expect(reference.actualParams?.[1]).toBe(3n);
		expect(reference.actualParams?.[2]).toBe("id-alg");
	});
});

describe("component DEFAULT values", () => {
	const MODULE = `DefaultTest DEFINITIONS ::= BEGIN
  Options ::= SEQUENCE {
    version   INTEGER DEFAULT 1,
    label     UTF8String DEFAULT "none",
    algorithm OBJECT IDENTIFIER DEFAULT { 1 2 840 }
  }
END`;

	it("keeps a scalar default rather than dropping it", () => {
		const { cst, errors } = parseModule(MODULE);
		expect(errors).toHaveLength(0);

		const ast = cstToAst(cst);
		const options = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "Options",
		);
		const components = (options?.type as AstSequenceType | undefined)
			?.components;

		expect(
			(components?.[0] as AstComponent | undefined)?.defaultValue,
		).toBeDefined();
		expect(
			(components?.[1] as AstComponent | undefined)?.defaultValue,
		).toBeDefined();
	});

	it("keeps a braced default whole instead of only its opening brace", () => {
		const { cst } = parseModule(MODULE);
		const ast = cstToAst(cst);
		const options = ast.assignments.find(
			(a: AnyAstAssignment) => a.name === "Options",
		);
		const components = (options?.type as AstSequenceType | undefined)
			?.components;

		const algorithm = (components?.[2] as AstComponent | undefined)
			?.defaultValue;
		expect(algorithm).toBeDefined();
		expect(algorithm).not.toMatchObject({ kind: "literal" });
	});
});
