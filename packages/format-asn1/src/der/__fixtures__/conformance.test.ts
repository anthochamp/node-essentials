import { existsSync, readFileSync } from "node:fs";

/**
 * ASN.1 DER E2E Conformance Test Suite
 *
 * Sources (per lib/asn1-temp-poc/docs/e2e-test-sources.md): 1. ITU-T X.690
 * specification examples — inline canonical ground truth 2. NIST PKITS — 405
 * DER-encoded X.509 certificates (decode→re-encode identity) 3. OpenSSL
 * test/certs — 346 PEM files (valid round-trips + malformed rejection) 4.
 * Bouncy Castle — non-PKITS certs covering EC, RSA, PQC, S/MIME (round-trips) 5.
 * Peter Gutmann pathological encodings via pyca/cryptography custom vectors 6.
 * System CA bundle — all installed CA certificates
 */
import { bytesIsEqual } from "@ac-kit/core";
import {
	classifyPycaCert,
	loadBcJavaCerts,
	loadNistPkitsCerts,
	loadOpenSslMalformedCerts,
	loadOpenSslValidCerts,
	loadPycaGutmannCerts,
} from "@ac-kit/fixture-x509";
import { describe, expect, it } from "vitest";

import { DecodingError } from "../../_encoding/errors.js";
import { berDecode } from "../../ber.js";
import { DefValueOf } from "../../schema/def.js";
import { ref } from "../../schema/types/base.js";
import { component } from "../../schema/types/constructed/component.js";
import { sequence } from "../../schema/types/constructed/sequence.js";
import { set } from "../../schema/types/constructed/set.js";
import { bitString } from "../../schema/types/primitives/bit-string.js";
import { boolean } from "../../schema/types/primitives/boolean.js";
import { integer } from "../../schema/types/primitives/integer.js";
import { nullType } from "../../schema/types/primitives/null.js";
import { objectIdentifier } from "../../schema/types/primitives/object-identifier.js";
import { octetString } from "../../schema/types/primitives/octet-string.js";
import { utf8String } from "../../schema/types/strings/utf8-string.js";
import { derDecode } from "../decode.js";
import { derEncode } from "../encode.js";
import { CertificateDef } from "./x509.js";

// ── 1. X.690 Specification Examples ──────────────────────────────────────────
// Ground-truth byte vectors from the ITU-T X.690 (2021) standard.
// These are the single source of truth for type-by-type encoding correctness.

describe("X.690 §8 — specification encoding examples", () => {
	describe("BOOLEAN (§8.2)", () => {
		const def = ref(boolean());
		it("FALSE = 01 01 00", () => {
			expect(derEncode(def, false)).toEqual(new Uint8Array([0x01, 0x01, 0x00]));
			expect(derDecode(def, new Uint8Array([0x01, 0x01, 0x00]))).toBe(false);
		});
		it("TRUE = 01 01 FF (DER canonical)", () => {
			expect(derEncode(def, true)).toEqual(new Uint8Array([0x01, 0x01, 0xff]));
		});
		it("BER accepts any non-zero TRUE, DER strict rejects 01 01 01", () => {
			expect(berDecode(def, new Uint8Array([0x01, 0x01, 0x01]))).toBe(true);
			expect(() =>
				derDecode(def, new Uint8Array([0x01, 0x01, 0x01]), true),
			).toThrow();
		});
	});

	describe("INTEGER (§8.3)", () => {
		const def = ref(integer());
		// X.690 Table 5 examples
		const vectors: [bigint, number[]][] = [
			[0n, [0x02, 0x01, 0x00]],
			[127n, [0x02, 0x01, 0x7f]],
			[128n, [0x02, 0x02, 0x00, 0x80]],
			[256n, [0x02, 0x02, 0x01, 0x00]],
			[-128n, [0x02, 0x01, 0x80]],
			[-129n, [0x02, 0x02, 0xff, 0x7f]],
		];
		for (const [value, bytes] of vectors) {
			it(`${value} = ${bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")}`, () => {
				const encoded = new Uint8Array(bytes);
				expect(derEncode(def, value)).toEqual(encoded);
				expect(derDecode(def, encoded)).toBe(value);
			});
		}
		it("long-form length: value with 128 bytes body uses 81 80 length prefix", () => {
			const big = (1n << 1016n) - 1n; // 127 bytes of 0xFF
			const enc = derEncode(def, big);
			expect(enc[1]).toBe(0x81); // long-form length
			expect(derDecode(def, enc)).toBe(big);
		});
	});

	describe("BIT STRING (§8.6)", () => {
		const def = ref(bitString());
		it("empty: 03 01 00", () => {
			expect(
				derEncode(def, { bytes: new Uint8Array(0), unusedBits: 0 }),
			).toEqual(new Uint8Array([0x03, 0x01, 0x00]));
		});
		it("0b01101110_0101_1101_1100_0000 (3 unused): 03 04 06 6E 5D C0", () => {
			// From X.690 §8.6.4.2 example
			const enc = derEncode(def, {
				bytes: new Uint8Array([0x6e, 0x5d, 0xc0]),
				unusedBits: 3,
			});
			expect(enc).toEqual(new Uint8Array([0x03, 0x04, 0x03, 0x6e, 0x5d, 0xc0]));
			const dec = derDecode(def, enc);
			expect(dec.unusedBits).toBe(3);
			expect(dec.bytes).toEqual(new Uint8Array([0x6e, 0x5d, 0xc0]));
		});
		it("preserves trailing 0x00 bytes (meaningful data)", () => {
			const v = { bytes: new Uint8Array([0xab, 0x00]), unusedBits: 0 };
			const encoded = derEncode(def, v);
			// TLV: 03 (tag) 03 (len=3) 00 (unusedBits) AB 00 (data)
			expect(encoded).toEqual(new Uint8Array([0x03, 0x03, 0x00, 0xab, 0x00]));
			const decoded = derDecode(def, encoded);
			expect(decoded.bytes).toEqual(new Uint8Array([0xab, 0x00]));
			expect(decoded.unusedBits).toBe(0);
		});
	});

	describe("OCTET STRING (§8.7)", () => {
		const def = ref(octetString());
		it("04 04 01 23 45 67", () => {
			const v = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
			expect(derEncode(def, v)).toEqual(
				new Uint8Array([0x04, 0x04, 0x01, 0x23, 0x45, 0x67]),
			);
			expect(
				derDecode(def, new Uint8Array([0x04, 0x04, 0x01, 0x23, 0x45, 0x67])),
			).toEqual(v);
		});
	});

	describe("NULL (§8.8)", () => {
		it("05 00", () => {
			expect(derEncode(ref(nullType), null)).toEqual(
				new Uint8Array([0x05, 0x00]),
			);
			expect(derDecode(ref(nullType), new Uint8Array([0x05, 0x00]))).toBeNull();
		});
	});

	describe("OBJECT IDENTIFIER (§8.19)", () => {
		const def = ref(objectIdentifier());
		// X.690 §8.19.5 example: 2.999.3 → 88 37 03
		it("2.999.3 = 06 03 88 37 03", () => {
			const oid = [2, 999, 3];
			const enc = derEncode(def, oid);
			expect(enc).toEqual(new Uint8Array([0x06, 0x03, 0x88, 0x37, 0x03]));
			expect(derDecode(def, enc)).toEqual(oid);
		});
		it("1.2.840.113549.1.1.11 (sha256WithRSAEncryption)", () => {
			const oid = [1, 2, 840, 113549, 1, 1, 11];
			expect(derDecode(def, derEncode(def, oid))).toEqual(oid);
		});
		it("2.5.4.3 (commonName) = 06 03 55 04 03", () => {
			expect(derEncode(def, [2, 5, 4, 3])).toEqual(
				new Uint8Array([0x06, 0x03, 0x55, 0x04, 0x03]),
			);
		});
	});

	describe("UTF8String (§8.21)", () => {
		const def = ref(utf8String());
		it("'Test1' = 0C 05 54 65 73 74 31", () => {
			expect(derEncode(def, "Test1")).toEqual(
				new Uint8Array([0x0c, 0x05, 0x54, 0x65, 0x73, 0x74, 0x31]),
			);
		});
		it("multi-byte Unicode round-trips", () => {
			expect(derDecode(def, derEncode(def, "caf\u00e9 \u4e2d\u6587"))).toBe(
				"caf\u00e9 \u4e2d\u6587",
			);
		});
	});

	describe("SEQUENCE (§8.9)", () => {
		const def = ref(
			sequence([component("a", integer()), component("b", integer())] as const),
		);
		it("SEQUENCE { INTEGER 5, INTEGER 6 } = 30 06 02 01 05 02 01 06", () => {
			const enc = derEncode(def, { a: 5n, b: 6n });
			expect(enc).toEqual(
				new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x05, 0x02, 0x01, 0x06]),
			);
			const dec = derDecode(def, enc);
			expect(dec.a).toBe(5n);
			expect(dec.b).toBe(6n);
		});
	});

	describe("SET (§8.11 + §11.6 DER ordering)", () => {
		// DER: SET components must be in ascending tag order
		const def = ref(
			set([
				component("b", integer()), // tag 0x02
				component("a", utf8String()), // tag 0x0C
			] as const),
		);
		it("encodes INTEGER before UTF8String (tag 02 < 0C)", () => {
			const enc = derEncode(def, { a: "x", b: 1n });
			expect(enc[0]).toBe(0x31); // SET tag
			expect(enc[2]).toBe(0x02); // INTEGER comes first
		});
	});

	describe("Length encoding (§8.1.3)", () => {
		const def = ref(octetString());
		it("length < 128 uses short form", () => {
			const enc = derEncode(def, new Uint8Array(10));
			expect(enc[1]).toBe(10);
		});
		it("length 128 uses long form 0x81 0x80", () => {
			const enc = derEncode(def, new Uint8Array(128));
			expect(enc[1]).toBe(0x81);
			expect(enc[2]).toBe(128);
		});
		it("length 256 uses long form 0x82 0x01 0x00", () => {
			const enc = derEncode(def, new Uint8Array(256));
			expect(enc[1]).toBe(0x82);
			expect(enc[2]).toBe(1);
			expect(enc[3]).toBe(0);
		});
	});
});

// ── 2. NIST PKITS — 405 DER Certificates ─────────────────────────────────────

const pkitsCerts = loadNistPkitsCerts();

describe(`NIST PKITS — DER round-trip (${pkitsCerts.length} certificates)`, () => {
	// Per-certificate test: decode → re-encode → byte identity
	for (const cert of pkitsCerts) {
		it(`${cert.name} (${cert.der.length}B): decode→re-encode identity`, () => {
			const decoded = derDecode(CertificateDef, cert.der);
			const reencoded = derEncode(CertificateDef, decoded);
			if (!bytesIsEqual(reencoded, cert.der)) {
				throw new Error(
					`Round-trip mismatch: original ${cert.der.length}B, re-encoded ${reencoded.length}B`,
				);
			}
		});
	}

	it(`all ${pkitsCerts.length} PKITS certs: batch conformance check`, () => {
		const failures: string[] = [];
		for (const cert of pkitsCerts) {
			try {
				const decoded = derDecode(CertificateDef, cert.der);
				const reencoded = derEncode(CertificateDef, decoded);
				if (!bytesIsEqual(reencoded, cert.der)) {
					failures.push(
						`${cert.name}: size ${cert.der.length}→${reencoded.length}`,
					);
				}
			} catch (e) {
				failures.push(`${cert.name}: ${(e as Error).message}`);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length}/${pkitsCerts.length} failed:\n${failures.slice(0, 20).join("\n")}`,
			);
		}
	});
});

// ── 3. OpenSSL test/certs — Valid Certificates ────────────────────────────────

const opensslValid = loadOpenSslValidCerts();

describe(`OpenSSL test/certs — valid cert round-trips (${opensslValid.length} certs)`, () => {
	it(`all ${opensslValid.length} valid OpenSSL certs decode as X.509`, () => {
		// `extractCertsFromPem` (in @ac-kit/fixture-x509) only extracts
		// "-----BEGIN CERTIFICATE-----" blocks, so key/CSR/CRL PEM files in
		// OpenSSL's test/certs never produce an entry here in the first place —
		// every file this loop sees is a genuine X.509 certificate. Any
		// decode failure is therefore a real codec bug, not an expected
		// rejection: 0 failures is the target, not a tolerated rate.
		const failures: string[] = [];
		for (const cert of opensslValid) {
			try {
				derDecode(CertificateDef, cert.der);
			} catch (e) {
				failures.push(
					`${cert.name}: ${(e as Error).constructor.name}: ${(e as Error).message.slice(0, 120)}`,
				);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length}/${opensslValid.length} unexpected decode failures:\n${failures.join("\n")}`,
			);
		}
	});

	it("round-trip identity holds for all valid OpenSSL certs", () => {
		const failures: string[] = [];
		for (const cert of opensslValid) {
			const decoded = derDecode(CertificateDef, cert.der);
			const reencoded = derEncode(CertificateDef, decoded);
			if (!bytesIsEqual(reencoded, cert.der)) {
				failures.push(
					`${cert.name}: ${cert.der.length}B → ${reencoded.length}B`,
				);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length}/${opensslValid.length} round-trip failures:\n${failures.join("\n")}`,
			);
		}
	});
});

// ── 4. OpenSSL test/certs — Malformed/Error Cases ────────────────────────────

const opensslMalformed = loadOpenSslMalformedCerts();

describe(`OpenSSL test/certs — error handling (${opensslMalformed.length} malformed files)`, () => {
	it("malformed certs either decode (structurally valid, semantically bad) or are rejected with a DecodingError", () => {
		// 'bad'-prefixed files may still be structurally valid ASN.1 — they have
		// bad semantic content (wrong key, expired, etc.) but correct DER
		// encoding. The DER codec only validates structure, not semantics, so
		// either outcome is acceptable — anything other than a DecodingError is
		// a codec bug, not a rejected file, and fails the test.
		const unexpected: string[] = [];
		let decoded = 0;
		let rejected = 0;
		for (const cert of opensslMalformed) {
			try {
				derDecode(CertificateDef, cert.der);
				decoded++;
			} catch (e) {
				if (e instanceof DecodingError) {
					rejected++;
				} else {
					unexpected.push(
						`${cert.name}: ${(e as Error).constructor.name}: ${(e as Error).message}`,
					);
				}
			}
		}
		if (unexpected.length > 0) {
			throw new Error(
				`${unexpected.length} unexpected (non-DecodingError) failures:\n${unexpected.join("\n")}`,
			);
		}
		expect(decoded + rejected).toBe(opensslMalformed.length);
	});
});

// ── 5. System CA bundle ───────────────────────────────────────────────────────

const CA_BUNDLE_PATHS = [
	"/etc/ssl/certs/ca-bundle.crt",
	"/etc/ssl/certs/ca-certificates.crt",
];

function loadSystemCerts(): Uint8Array[] {
	for (const p of CA_BUNDLE_PATHS) {
		if (existsSync(p)) {
			const pem = readFileSync(p, "utf-8");
			const certs: Uint8Array[] = [];
			const re =
				/-----BEGIN CERTIFICATE-----\r?\n([\s\S]+?)\r?\n-----END CERTIFICATE-----/g;
			let m: RegExpExecArray | null;
			while ((m = re.exec(pem))) {
				certs.push(
					new Uint8Array(Buffer.from(m[1]!.replace(/\s/g, ""), "base64")),
				);
			}
			return certs;
		}
	}
	return [];
}

const systemCerts = loadSystemCerts();

describe(`System CA bundle — DER round-trips (${systemCerts.length} certificates)`, () => {
	if (systemCerts.length === 0) {
		it.skip("No system CA bundle found", () => {});
		return;
	}

	it(`all ${systemCerts.length} system CA certs: decode→re-encode byte identity`, () => {
		const failures: string[] = [];
		for (let i = 0; i < systemCerts.length; i++) {
			const der = systemCerts[i]!;
			try {
				const decoded = derDecode(CertificateDef, der);
				const reencoded = derEncode(CertificateDef, decoded);
				if (!bytesIsEqual(reencoded, der)) {
					failures.push(
						`cert #${i + 1} (${der.length}B): re-encoded to ${reencoded.length}B`,
					);
				}
			} catch (e) {
				failures.push(`cert #${i + 1}: ${(e as Error).message.slice(0, 80)}`);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length} failures:\n${failures.slice(0, 20).join("\n")}`,
			);
		}
	});
});

// ── 6. Bouncy Castle test certificates ───────────────────────────────────────

const bcCerts = loadBcJavaCerts();

describe(`Bouncy Castle — DER round-trips (${bcCerts.length} certificates)`, () => {
	it(`all ${bcCerts.length} BC certs decode as X.509`, () => {
		// `loadBcJavaCerts` (in @ac-kit/fixture-x509) recurses into both
		// resource directories and sniffs PEM armor by content, so every entry
		// here is a genuine X.509 certificate — key/CRL/S-MIME files in the
		// same directories contribute zero entries instead of reaching this
		// loop. 0 failures is the target, not a tolerated rate.
		const failures: string[] = [];
		for (const cert of bcCerts) {
			try {
				derDecode(CertificateDef, cert.der);
			} catch (e) {
				failures.push(
					`${cert.name}: ${(e as Error).constructor.name}: ${(e as Error).message.slice(0, 120)}`,
				);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length}/${bcCerts.length} unexpected decode failures:\n${failures.join("\n")}`,
			);
		}
	});

	it("round-trip identity holds for all BC certs", () => {
		const failures: string[] = [];
		for (const cert of bcCerts) {
			const decoded = derDecode(CertificateDef, cert.der);
			const reencoded = derEncode(CertificateDef, decoded);
			if (!bytesIsEqual(reencoded, cert.der)) {
				failures.push(
					`${cert.name}: ${cert.der.length}B → ${reencoded.length}B`,
				);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`${failures.length}/${bcCerts.length} round-trip failures:\n${failures.join("\n")}`,
			);
		}
	});
});

// ── 7. Peter Gutmann pathological encodings (via pyca/cryptography vectors) ───

const gutmannCerts = loadPycaGutmannCerts();

describe(`Peter Gutmann pathological encodings via pyca/cryptography (${gutmannCerts.length} vectors)`, () => {
	const valid = gutmannCerts.filter((c) => classifyPycaCert(c) === "valid");
	const malformed = gutmannCerts.filter(
		(c) => classifyPycaCert(c) === "malformed",
	);

	describe(`valid vectors (${valid.length}) — round-trip identity`, () => {
		it("all valid pyca certs decode as X.509 and round-trip identically", () => {
			// `loadPycaGutmannCerts` (in @ac-kit/fixture-x509) excludes `crl_*`
			// vectors (a CertificateList, not a Certificate) from this directory,
			// so every "valid"-classified entry here is a genuine, well-formed
			// X.509 certificate — 0 failures is the target, not a tolerated rate.
			const failures: string[] = [];
			for (const cert of valid) {
				const decoded = derDecode(CertificateDef, cert.der);
				const reencoded = derEncode(CertificateDef, decoded);
				if (!bytesIsEqual(reencoded, cert.der)) {
					failures.push(
						`${cert.name}: ${cert.der.length}B → ${reencoded.length}B`,
					);
				}
			}
			if (failures.length > 0) {
				throw new Error(
					`${failures.length}/${valid.length} round-trip failures:\n${failures.join("\n")}`,
				);
			}
		});
	});

	describe(`malformed / pathological vectors (${malformed.length}) — Gutmann edge cases`, () => {
		// For each malformed cert, the DER decoder should either:
		// (a) Reject it with a DecodingError (structural ASN.1 violation), OR
		// (b) Accept it (the malformation is semantic, not structural — e.g. invalid UTF-8
		//     is valid DER bytes, bad country code is a valid-length string, etc.)
		// Either way, it must NOT crash or produce a wrong round-trip for accepted inputs.

		for (const cert of malformed) {
			it(`${cert.name} — decoder handles it (reject or accept cleanly)`, () => {
				let decoded: DefValueOf<typeof CertificateDef> | undefined;
				let decodeErr: Error | undefined;
				try {
					decoded = derDecode(CertificateDef, cert.der);
				} catch (e) {
					decodeErr = e as Error;
				}

				if (decodeErr) {
					// A structural rejection must be the codec's own DecodingError —
					// any other thrown type is a codec bug, not a clean rejection.
					expect(decodeErr).toBeInstanceOf(DecodingError);
				} else {
					// Structurally valid but semantically bad: round-trip must still hold
					const reencoded = derEncode(CertificateDef, decoded!);
					if (!bytesIsEqual(reencoded, cert.der)) {
						// Only fail if size differs — some encodings normalize (e.g. invalid UTF-8 chars preserved as-is)
						throw new Error(
							`${cert.name}: round-trip mismatch ${cert.der.length}B → ${reencoded.length}B`,
						);
					}
				}
			});
		}
	});
});
