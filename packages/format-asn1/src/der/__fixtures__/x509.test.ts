import { existsSync, readFileSync } from "node:fs";

import { bytesIsEqual } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { derDecode, derEncode } from "../../der.js";
import type { Asn1TaggedTypeDef } from "../../schema/types/base.js";
import type { Asn1ComponentDef } from "../../schema/types/constructed/component.js";
import { CertificateDef, TBSCertificateDef } from "./x509.js";

const CERT_DEF = CertificateDef;

// ── PEM bundle parser ─────────────────────────────────────────────────────────

/** Split a PEM bundle into individual base64-decoded DER certificates. */
function parsePemBundle(pem: string): Uint8Array[] {
	const certs: Uint8Array[] = [];
	const regex =
		/-----BEGIN CERTIFICATE-----\r?\n([\s\S]+?)\r?\n-----END CERTIFICATE-----/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(pem)) !== null) {
		const b64 = match[1]!.replace(/\s/g, "");
		const raw = Buffer.from(b64, "base64");
		certs.push(new Uint8Array(raw));
	}
	return certs;
}

// ── System CA bundle ──────────────────────────────────────────────────────────

const CA_BUNDLE_PATHS = [
	"/etc/ssl/certs/ca-bundle.crt",
	"/etc/ssl/certs/ca-certificates.crt",
	"/usr/share/ca-certificates/ca-bundle.crt",
];

function loadSystemCerts(): Uint8Array[] {
	for (const path of CA_BUNDLE_PATHS) {
		if (existsSync(path)) {
			const pem = readFileSync(path, "utf-8");
			return parsePemBundle(pem);
		}
	}
	return [];
}

const systemCerts = loadSystemCerts();

// ── Unit tests: X.509 schema structure ────────────────────────────────────────

describe("X.509 schema structure", () => {
	it("CertificateDef def has kind 'sequence'", () => {
		expect(CertificateDef.kind).toBe("sequence");
	});

	it("CertificateDef has 3 components", () => {
		expect(CertificateDef.components).toHaveLength(3);
	});

	it("TBSCertificateDef version is [0] EXPLICIT OPTIONAL", () => {
		const tbsComp = TBSCertificateDef.components[0] as Asn1ComponentDef;
		expect(tbsComp.name).toBe("version");
		expect(tbsComp.optional).toBe(true);
		expect(tbsComp.type.kind).toBe("tagged");
		const tagged = tbsComp.type as Asn1TaggedTypeDef;
		expect(tagged.tag.tagNumber).toBe(0);
		expect(tagged.mode).toBe("explicit");
	});
});

// ── Fabricated certificate round-trip ─────────────────────────────────────────

describe("DER round-trip — fabricated structure", () => {
	const sha256WithRSA = [1, 2, 840, 113549, 1, 1, 11];
	const commonName = [2, 5, 4, 3];

	const certValue = {
		tbsCertificate: {
			version: 2n, // v3 = integer 2
			serialNumber: 0x1234567890abcdefn,
			signature: {
				algorithm: sha256WithRSA,
				parameters: { encoded: new Uint8Array([0x05, 0x00]) },
			},
			issuer: {
				kind: "rdnSequence" as const,
				value: [
					[
						{
							type: commonName,
							value: {
								encoded: new Uint8Array([0x0c, 0x04, 0x54, 0x65, 0x73, 0x74]),
							},
						},
					],
				],
			},
			validity: {
				notBefore: {
					kind: "utcTime" as const,
					value: {
						year: 2024,
						month: 1,
						day: 1,
						hour: 0,
						minute: 0,
						second: 0,
						utcOffsetMinutes: 0,
					},
				},
				notAfter: {
					kind: "utcTime" as const,
					value: {
						year: 2025,
						month: 1,
						day: 1,
						hour: 0,
						minute: 0,
						second: 0,
						utcOffsetMinutes: 0,
					},
				},
			},
			subject: {
				kind: "rdnSequence" as const,
				value: [
					[
						{
							type: commonName,
							value: {
								encoded: new Uint8Array([0x0c, 0x04, 0x54, 0x65, 0x73, 0x74]),
							},
						},
					],
				],
			},
			subjectPublicKeyInfo: {
				algorithm: {
					algorithm: [1, 2, 840, 113549, 1, 1, 1],
					parameters: { encoded: new Uint8Array([0x05, 0x00]) },
				},
				subjectPublicKey: {
					bytes: new Uint8Array([
						0x30, 0x09, 0x02, 0x01, 0x00, 0x02, 0x04, 0x00, 0x00, 0x00, 0x01,
					]),
					unusedBits: 0,
				},
			},
		},
		signatureAlgorithm: {
			algorithm: sha256WithRSA,
			parameters: { encoded: new Uint8Array([0x05, 0x00]) },
		},
		signature: { bytes: new Uint8Array(32).fill(0xab), unusedBits: 0 },
	};

	it("encodes without throwing", () => {
		expect(() => derEncode(CERT_DEF, certValue)).not.toThrow();
	});

	it("DER encode → decode → re-encode is byte-for-byte identical", () => {
		const encoded1 = derEncode(CERT_DEF, certValue);
		const decoded = derDecode(CERT_DEF, encoded1);
		const encoded2 = derEncode(CERT_DEF, decoded);
		expect(encoded2).toEqual(encoded1);
	});

	it("decoded structure has correct types", () => {
		const encoded = derEncode(CERT_DEF, certValue);
		const decoded = derDecode(CERT_DEF, encoded);
		expect(decoded.tbsCertificate).toBeDefined();
		expect(decoded.signature).toBeDefined();
		expect(decoded.signature.unusedBits).toBe(0);
	});

	it("v1 certificate (no version field) round-trips", () => {
		const v1cert = {
			tbsCertificate: {
				// No version field — v1
				serialNumber: 1n,
				signature: { algorithm: sha256WithRSA },
				issuer: {
					kind: "rdnSequence" as const,
					value: [
						[
							{
								type: commonName,
								value: { encoded: new Uint8Array([0x0c, 0x02, 0x43, 0x41]) },
							},
						],
					],
				},
				validity: {
					notBefore: {
						kind: "utcTime" as const,
						value: {
							year: 2020,
							month: 1,
							day: 1,
							hour: 0,
							minute: 0,
							second: 0,
							utcOffsetMinutes: 0,
						},
					},
					notAfter: {
						kind: "utcTime" as const,
						value: {
							year: 2030,
							month: 1,
							day: 1,
							hour: 0,
							minute: 0,
							second: 0,
							utcOffsetMinutes: 0,
						},
					},
				},
				subject: {
					kind: "rdnSequence" as const,
					value: [
						[
							{
								type: commonName,
								value: { encoded: new Uint8Array([0x0c, 0x02, 0x43, 0x41]) },
							},
						],
					],
				},
				subjectPublicKeyInfo: {
					algorithm: { algorithm: [1, 2, 840, 113549, 1, 1, 1] },
					subjectPublicKey: {
						bytes: new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x01]),
						unusedBits: 0,
					},
				},
			},
			signatureAlgorithm: { algorithm: sha256WithRSA },
			signature: { bytes: new Uint8Array([0xde, 0xad]), unusedBits: 0 },
		};
		const enc1 = derEncode(CERT_DEF, v1cert);
		const decoded = derDecode(CERT_DEF, enc1);
		// version should be absent
		expect(decoded.tbsCertificate.version).toBeUndefined();
		const enc2 = derEncode(CERT_DEF, decoded);
		expect(enc2).toEqual(enc1);
	});
});

// ── Real-world system CA certificate round-trips ───────────────────────────────

describe(`DER round-trip — real system CA certificates (${systemCerts.length} available)`, () => {
	if (systemCerts.length === 0) {
		it.skip("no system CA bundle found", () => {});
		return;
	}

	// Test first 20 certificates from the bundle (covers common structures)
	const testCerts = systemCerts.slice(0, 20);

	for (let i = 0; i < testCerts.length; i++) {
		const der = testCerts[i]!;
		it(`cert #${i + 1} (${der.length} bytes): decode → re-encode = byte identity`, () => {
			// Decode — any structural error here indicates a schema or decoder bug
			let decoded: ReturnType<typeof derDecode<typeof CERT_DEF>>;
			try {
				decoded = derDecode(CERT_DEF, der);
			} catch (e) {
				throw new Error(
					`Decode failed for cert #${i + 1}: ${(e as Error).message}`,
				);
			}

			// Re-encode — must produce the exact same bytes (DER is canonical)
			let reencoded: Uint8Array;
			try {
				reencoded = derEncode(CERT_DEF, decoded);
			} catch (e) {
				throw new Error(
					`Re-encode failed for cert #${i + 1}: ${(e as Error).message}`,
				);
			}

			expect(reencoded).toEqual(der);
		});
	}
});

describe("DER round-trip — all system CA certificates (full conformance)", () => {
	if (systemCerts.length === 0) {
		it.skip("no system CA bundle found", () => {});
		return;
	}

	it(`all ${systemCerts.length} CA certs pass decode → re-encode identity`, () => {
		const failures: string[] = [];
		for (let i = 0; i < systemCerts.length; i++) {
			const der = systemCerts[i]!;
			try {
				const decoded = derDecode(CERT_DEF, der);
				const reencoded = derEncode(CERT_DEF, decoded);
				if (!bytesIsEqual(reencoded, der)) {
					failures.push(
						`cert #${i + 1}: ${der.length} bytes — re-encoded ${reencoded.length} bytes differ`,
					);
				}
			} catch (e) {
				failures.push(`cert #${i + 1}: ${(e as Error).message}`);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length} failures:\n${failures.slice(0, 10).join("\n")}`,
			);
		}
	});
});
