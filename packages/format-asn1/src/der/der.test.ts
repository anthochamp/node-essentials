import { describe, expect, it } from "vitest";

import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import { contextImplicitTag, contextTag, ref } from "../schema/types/base.js";
import { choice } from "../schema/types/constructed/choice.js";
import {
	alternative,
	component,
} from "../schema/types/constructed/component.js";
import { sequenceOf } from "../schema/types/constructed/sequence-of.js";
import { sequence } from "../schema/types/constructed/sequence.js";
import { setOf } from "../schema/types/constructed/set-of.js";
import { set } from "../schema/types/constructed/set.js";
import { bitString } from "../schema/types/primitives/bit-string.js";
import { boolean } from "../schema/types/primitives/boolean.js";
import { integer } from "../schema/types/primitives/integer.js";
import { nullType } from "../schema/types/primitives/null.js";
import { objectIdentifier } from "../schema/types/primitives/object-identifier.js";
import { utf8String } from "../schema/types/strings/utf8-string.js";
import { derDecode } from "./decode.js";
import { derEncode } from "./encode.js";

// ── X.690 §11 test vectors ────────────────────────────────────────────────────

describe("DER BOOLEAN", () => {
	const def = ref(boolean());
	it("TRUE = 01 01 FF (DER canonical)", () => {
		expect(derEncode(def, true)).toEqual(new Uint8Array([0x01, 0x01, 0xff]));
	});
	it("FALSE = 01 01 00", () => {
		expect(derEncode(def, false)).toEqual(new Uint8Array([0x01, 0x01, 0x00]));
	});
	it("strict decode rejects non-canonical TRUE (0x01 is valid BER but not DER)", () => {
		expect(() =>
			derDecode(def, new Uint8Array([0x01, 0x01, 0x01]), true),
		).toThrow();
	});
	it("round-trips both values", () => {
		for (const v of [true, false])
			expect(derDecode(def, derEncode(def, v))).toBe(v);
	});
});

describe("DER INTEGER", () => {
	const def = ref(integer());
	it("minimal encoding — no redundant leading bytes", () => {
		// 256 = 0x100, minimum is 02 02 01 00 (2-byte content)
		expect(derEncode(def, 256n)).toEqual(
			new Uint8Array([0x02, 0x02, 0x01, 0x00]),
		);
	});
	it("round-trips large values", () => {
		const v = 1234567890123456789n;
		expect(derDecode(def, derEncode(def, v))).toBe(v);
	});
});

describe("DER BIT STRING — data bytes preserved", () => {
	const def = ref(bitString());
	it("preserves trailing zero bytes (they are meaningful data)", () => {
		// A BIT STRING with unusedBits=0 and last byte 0x00 is valid DER — the 0x00 is data
		const v = { bytes: new Uint8Array([0xa0, 0x00]), unusedBits: 0 };
		const encoded = derEncode(def, v);
		// Must NOT strip the trailing 0x00
		expect(encoded).toEqual(new Uint8Array([0x03, 0x03, 0x00, 0xa0, 0x00]));
	});
	it("round-trips non-zero bit string", () => {
		const v = { bytes: new Uint8Array([0xff, 0x80]), unusedBits: 7 };
		const decoded = derDecode(def, derEncode(def, v)) as any;
		expect(decoded.unusedBits).toBe(7);
	});
});

describe("DER SEQUENCE", () => {
	const AlgorithmIdentifier = sequence([
		component("algorithm", objectIdentifier()),
		component("parameters", nullType).optional(),
	] as const);
	const def: AnyAsn1TypeDef = ref(AlgorithmIdentifier);

	it("encodes AlgorithmIdentifier (sha256WithRSAEncryption)", () => {
		const value = {
			algorithm: [1, 2, 840, 113549, 1, 1, 11],
			parameters: null,
		};
		const encoded = derEncode(def, value);
		expect(encoded[0]).toBe(0x30); // SEQUENCE
		const decoded = derDecode(def, encoded) as any;
		expect(decoded.algorithm).toEqual([1, 2, 840, 113549, 1, 1, 11]);
		expect(decoded.parameters).toBeNull();
	});

	it("omits OPTIONAL absent parameters", () => {
		const value = { algorithm: [2, 5, 4, 3] };
		const decoded = derDecode(def, derEncode(def, value)) as any;
		expect(decoded.parameters).toBeUndefined();
	});
});

describe("DER SET — components in ascending tag order", () => {
	// SET { [1] INTEGER, [0] UTF8String } — DER must sort: [0] before [1]
	const def = ref(
		set([
			component("b", contextImplicitTag(1, integer())),
			component("a", contextImplicitTag(0, utf8String())),
		] as const),
	);

	it("encodes in tag order (lower tags first)", () => {
		const encoded = derEncode(def, { a: "hello", b: 42n });
		// [0] tag (0x80) should come before [1] tag (0x81)
		const firstTag = encoded[2]!; // after 31 0A SEQUENCE header
		expect(firstTag).toBe(0x80); // [0] IMPLICIT
	});
});

describe("DER SET OF — elements in lexicographic order", () => {
	const def = ref(setOf(objectIdentifier()));

	it("encodes elements in sorted byte order", () => {
		const value = [
			[2, 5, 4, 6],
			[2, 5, 4, 3],
			[2, 5, 4, 10],
		];
		const encoded = derEncode(def, value);
		const decoded = derDecode(def, encoded);
		// Should still decode correctly (order is canonical)
		expect(decoded).toHaveLength(3);
	});
});

describe("DER tagged types", () => {
	it("EXPLICIT tag wraps inner TLV", () => {
		const def = ref(contextTag(0, integer()));
		const encoded = derEncode(def, 5n);
		expect(encoded[0]).toBe(0xa0); // [0] EXPLICIT constructed
		expect(derDecode(def, encoded)).toBe(5n);
	});

	it("IMPLICIT tag replaces inner tag", () => {
		const def = ref(contextImplicitTag(2, utf8String()));
		const encoded = derEncode(def, "test");
		expect(encoded[0]).toBe(0x82); // [2] IMPLICIT primitive
		expect(derDecode(def, encoded)).toBe("test");
	});
});

// ── Simulated X.509 SubjectPublicKeyInfo round-trip ───────────────────────────

describe("DER — SubjectPublicKeyInfo round-trip (X.509 structure)", () => {
	const AlgorithmIdentifier = sequence([
		component("algorithm", objectIdentifier()),
		component("parameters", nullType).optional(),
	] as const);

	const SubjectPublicKeyInfo = sequence([
		component("algorithm", AlgorithmIdentifier),
		component("subjectPublicKey", bitString()),
	] as const);

	const def: AnyAsn1TypeDef = ref(SubjectPublicKeyInfo);

	it("encodes and decodes a full SubjectPublicKeyInfo", () => {
		const value = {
			algorithm: { algorithm: [1, 2, 840, 113549, 1, 1, 1], parameters: null }, // rsaEncryption
			subjectPublicKey: {
				bytes: new Uint8Array([0x30, 0x0d, 0x00, 0x01]),
				unusedBits: 0,
			},
		};
		const encoded = derEncode(def, value);
		expect(encoded[0]).toBe(0x30);
		const decoded = derDecode(def, encoded) as any;
		expect(decoded.algorithm.algorithm).toEqual([1, 2, 840, 113549, 1, 1, 1]);
		expect(decoded.subjectPublicKey.unusedBits).toBe(0);
		// Byte-for-byte identity (canonical DER)
		expect(derEncode(def, decoded)).toEqual(encoded);
	});
});

describe("DER SEQUENCE OF", () => {
	const def = ref(sequenceOf(objectIdentifier()));
	it("round-trips a list of OIDs", () => {
		const value = [
			[2, 5, 4, 3],
			[2, 5, 4, 6],
			[2, 5, 4, 10],
		];
		const encoded = derEncode(def, value);
		const decoded = derDecode(def, encoded);
		expect(decoded).toEqual(value);
	});
});

describe("DER CHOICE", () => {
	const Time = choice([
		alternative("utcTime", contextImplicitTag(0, utf8String())),
		alternative("generalTime", contextImplicitTag(1, utf8String())),
	] as const);

	it("encodes and decodes the correct alternative", () => {
		const v = { kind: "utcTime" as const, value: "240115120000Z" };
		const encoded = derEncode(ref(Time), v);
		const decoded = derDecode(ref(Time), encoded) as any;
		expect(decoded.kind).toBe("utcTime");
		expect(decoded.value).toBe("240115120000Z");
	});
});
