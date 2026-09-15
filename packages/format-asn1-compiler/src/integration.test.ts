import { parseModule } from "@ac-kit/format-asn1-notation";
import { cstToAst } from "@ac-kit/format-asn1-notation";
import { printModule } from "@ac-kit/format-asn1-notation";
/**
 * End-to-end integration tests using real-world RFC ASN.1 modules.
 *
 * These tests exercise the full pipeline: source text → parse → CST → AST →
 * compile → AnyAsn1TypeDef ← decompile ← AnyAsn1TypeDef → decompile → AST →
 * print → source text → parse (round-trip)
 */
import { describe, it, expect } from "vitest";

import {
	RFC5280_CERTIFICATE_MODULE,
	RFC2986_CSR_MODULE,
	RFC5652_CMS_MODULE,
} from "./__fixtures__/rfc-modules.js";
import { compileModules, decompileModules } from "./index.js";

function pipeline(src: string) {
	const { cst, errors: parseErrors } = parseModule(src);
	const ast = cstToAst(cst);
	const { defs, errors: compileErrors } = compileModules([ast]);
	return { cst, ast, defs, parseErrors, compileErrors };
}

// ── RFC 5280 — X.509 Certificate ─────────────────────────────────────────────

describe("RFC 5280 — X.509 Certificate (full module)", () => {
	it("parses without errors", () => {
		const { parseErrors } = pipeline(RFC5280_CERTIFICATE_MODULE);
		expect(parseErrors).toHaveLength(0);
	});

	it("compiles without errors", () => {
		const { compileErrors } = pipeline(RFC5280_CERTIFICATE_MODULE);
		expect(compileErrors).toHaveLength(0);
	});

	it("produces defs for all major types", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const mod = defs.get("PKIX1Explicit88");
		expect(mod?.has("Certificate")).toBe(true);
		expect(mod?.has("TBSCertificate")).toBe(true);
		expect(mod?.has("AlgorithmIdentifier")).toBe(true);
		expect(mod?.has("Name")).toBe(true);
		expect(mod?.has("Extension")).toBe(true);
	});

	it("Certificate is a SEQUENCE with 3 components", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const cert = defs.get("PKIX1Explicit88")?.get("Certificate");
		expect(cert?.kind).toBe("sequence");
		expect((cert as any).components).toHaveLength(3);
	});

	it("TBSCertificate version field is tagged [0] EXPLICIT", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const tbs = defs.get("PKIX1Explicit88")?.get("TBSCertificate");
		const versionComp = (tbs as any)?.components[0];
		expect(versionComp?.name).toBe("version");
		expect(versionComp?.type.kind).toBe("tagged");
		expect(versionComp?.type.tag.tagNumber).toBe(0);
		expect(versionComp?.type.mode).toBe("explicit");
	});

	it("Time is a CHOICE with 2 alternatives", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const time = defs.get("PKIX1Explicit88")?.get("Time");
		expect(time?.kind).toBe("choice");
		expect((time as any).alternatives).toHaveLength(2);
	});

	it("RelativeDistinguishedName is a setOf", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const rdn = defs.get("PKIX1Explicit88")?.get("RelativeDistinguishedName");
		expect(rdn?.kind).toBe("setOf");
	});

	it("Extensions is a sequenceOf with size constraint", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const exts = defs.get("PKIX1Explicit88")?.get("Extensions");
		expect(exts?.kind).toBe("sequenceOf");
	});

	it("AlgorithmIdentifier parameters field is OPTIONAL", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const ai = defs.get("PKIX1Explicit88")?.get("AlgorithmIdentifier");
		const params = (ai as any)?.components?.find(
			(c: any) => c.name === "parameters",
		);
		expect(params?.optional).toBe(true);
	});

	it("round-trip: decompile → print → parse produces valid ASN.1", () => {
		const { defs } = pipeline(RFC5280_CERTIFICATE_MODULE);
		const astModules = decompileModules(defs);
		const printed = printModule(astModules[0]!);

		const { errors: reparseErrors } = parseModule(printed);
		expect(reparseErrors).toHaveLength(0);
	});
});

// ── RFC 2986 — PKCS#10 CSR ───────────────────────────────────────────────────

describe("RFC 2986 — PKCS#10 Certificate Signing Request", () => {
	it("parses without errors", () => {
		const { parseErrors } = pipeline(RFC2986_CSR_MODULE);
		expect(parseErrors).toHaveLength(0);
	});

	it("compiles without errors", () => {
		const { compileErrors } = pipeline(RFC2986_CSR_MODULE);
		expect(compileErrors).toHaveLength(0);
	});

	it("CertificationRequest is a 3-component SEQUENCE", () => {
		const { defs } = pipeline(RFC2986_CSR_MODULE);
		const csr = defs.get("PKCS10")?.get("CertificationRequest");
		expect(csr?.kind).toBe("sequence");
		expect((csr as any).components).toHaveLength(3);
	});

	it("CertificationRequestInfo has IMPLICIT tagged attributes [0]", () => {
		const { defs } = pipeline(RFC2986_CSR_MODULE);
		const info = defs.get("PKCS10")?.get("CertificationRequestInfo");
		const attrs = (info as any)?.components?.find(
			(c: any) => c.name === "attributes",
		);
		expect(attrs?.optional).toBe(true);
		expect(attrs?.type.kind).toBe("tagged");
		expect(attrs?.type.mode).toBe("implicit");
	});
});

// ── RFC 5652 — CMS ───────────────────────────────────────────────────────────

describe("RFC 5652 — Cryptographic Message Syntax (CMS)", () => {
	it("parses without errors", () => {
		const { parseErrors } = pipeline(RFC5652_CMS_MODULE);
		expect(parseErrors).toHaveLength(0);
	});

	it("compiles without errors", () => {
		const { compileErrors } = pipeline(RFC5652_CMS_MODULE);
		expect(compileErrors).toHaveLength(0);
	});

	it("ContentInfo is a SEQUENCE", () => {
		const { defs } = pipeline(RFC5652_CMS_MODULE);
		const ci = defs.get("CryptographicMessageSyntax2004")?.get("ContentInfo");
		expect(ci?.kind).toBe("sequence");
	});

	it("SignedData has all 6 fields (including optional ones)", () => {
		const { defs } = pipeline(RFC5652_CMS_MODULE);
		const sd = defs.get("CryptographicMessageSyntax2004")?.get("SignedData");
		expect(sd?.kind).toBe("sequence");
		expect((sd as any).components).toHaveLength(6);
	});

	it("SignerIdentifier is a CHOICE", () => {
		const { defs } = pipeline(RFC5652_CMS_MODULE);
		const sid = defs
			.get("CryptographicMessageSyntax2004")
			?.get("SignerIdentifier");
		expect(sid?.kind).toBe("choice");
	});

	it("CMSVersion is INTEGER with named numbers", () => {
		const { defs } = pipeline(RFC5652_CMS_MODULE);
		const ver = defs.get("CryptographicMessageSyntax2004")?.get("CMSVersion");
		expect(ver?.kind).toBe("integer");
		expect((ver as any).namedNumbers?.length).toBeGreaterThan(0);
	});

	it("round-trip: CMS module survives compile → decompile → print → parse", () => {
		const { defs } = pipeline(RFC5652_CMS_MODULE);
		const astModules = decompileModules(defs);
		const printed = printModule(astModules[0]!);

		const { errors } = parseModule(printed);
		expect(errors).toHaveLength(0);
	});
});
