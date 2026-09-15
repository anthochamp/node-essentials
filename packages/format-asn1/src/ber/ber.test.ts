import { describe, expect, it } from "vitest";

import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import { contextImplicitTag, contextTag, ref } from "../schema/types/base.js";
import { choice } from "../schema/types/constructed/choice.js";
import {
	alternative,
	component,
} from "../schema/types/constructed/component.js";
import { sequence } from "../schema/types/constructed/sequence.js";
import { bitString } from "../schema/types/primitives/bit-string.js";
import { boolean } from "../schema/types/primitives/boolean.js";
import { enumerated } from "../schema/types/primitives/enumerated.js";
import { integer } from "../schema/types/primitives/integer.js";
import { nullType } from "../schema/types/primitives/null.js";
import { objectIdentifier } from "../schema/types/primitives/object-identifier.js";
import { octetString } from "../schema/types/primitives/octet-string.js";
import { utf8String } from "../schema/types/strings/utf8-string.js";
import { berDecode } from "./decode.js";
import { berEncode } from "./encode.js";

// X.690 §8 ground-truth test vectors

describe("BER BOOLEAN", () => {
	const def = ref(boolean());
	it("encodes FALSE → 01 01 00", () => {
		expect(berEncode(def, false)).toEqual(new Uint8Array([0x01, 0x01, 0x00]));
	});
	it("encodes TRUE → 01 01 FF (BER)", () => {
		expect(berEncode(def, true)).toEqual(new Uint8Array([0x01, 0x01, 0xff]));
	});
	it("decodes 01 01 00 → false", () => {
		expect(berDecode(def, new Uint8Array([0x01, 0x01, 0x00]))).toBe(false);
	});
	it("decodes 01 01 01 → true (BER: any non-zero)", () => {
		expect(berDecode(def, new Uint8Array([0x01, 0x01, 0x01]))).toBe(true);
	});
	it("round-trips", () => {
		for (const v of [true, false]) {
			expect(berDecode(def, berEncode(def, v))).toBe(v);
		}
	});
});

describe("BER INTEGER", () => {
	const def = ref(integer());
	it("encodes 0 → 02 01 00", () => {
		expect(berEncode(def, 0n)).toEqual(new Uint8Array([0x02, 0x01, 0x00]));
	});
	it("encodes 127 → 02 01 7F", () => {
		expect(berEncode(def, 127n)).toEqual(new Uint8Array([0x02, 0x01, 0x7f]));
	});
	it("encodes 128 → 02 02 00 80 (leading zero needed)", () => {
		expect(berEncode(def, 128n)).toEqual(
			new Uint8Array([0x02, 0x02, 0x00, 0x80]),
		);
	});
	it("encodes -1 → 02 01 FF", () => {
		expect(berEncode(def, -1n)).toEqual(new Uint8Array([0x02, 0x01, 0xff]));
	});
	it("encodes -128 → 02 01 80", () => {
		expect(berEncode(def, -128n)).toEqual(new Uint8Array([0x02, 0x01, 0x80]));
	});
	it("round-trips arbitrary values", () => {
		for (const v of [
			0n,
			1n,
			127n,
			128n,
			255n,
			256n,
			-1n,
			-128n,
			-129n,
			1000000n,
		]) {
			expect(berDecode(def, berEncode(def, v))).toBe(v);
		}
	});
});

describe("BER BIT STRING", () => {
	const def = ref(bitString());
	it("encodes empty bit string → 03 01 00", () => {
		expect(berEncode(def, { bytes: new Uint8Array(0), unusedBits: 0 })).toEqual(
			new Uint8Array([0x03, 0x01, 0x00]),
		);
	});
	it("round-trips", () => {
		const v = { bytes: new Uint8Array([0xa0]), unusedBits: 3 };
		const decoded = berDecode(def, berEncode(def, v));
		expect(decoded.unusedBits).toBe(3);
		expect(decoded.bytes).toEqual(new Uint8Array([0xa0]));
	});
});

describe("BER OCTET STRING", () => {
	const def = ref(octetString());
	it("encodes empty → 04 00", () => {
		expect(berEncode(def, new Uint8Array(0))).toEqual(
			new Uint8Array([0x04, 0x00]),
		);
	});
	it("round-trips bytes", () => {
		const v = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		expect(berDecode(def, berEncode(def, v))).toEqual(v);
	});
});

describe("BER NULL", () => {
	const def = ref(nullType);
	it("encodes → 05 00", () => {
		expect(berEncode(def, null)).toEqual(new Uint8Array([0x05, 0x00]));
	});
	it("decodes → null", () => {
		expect(berDecode(def, new Uint8Array([0x05, 0x00]))).toBeNull();
	});
});

describe("BER OBJECT IDENTIFIER", () => {
	const def = ref(objectIdentifier());
	it("encodes sha256 OID 2.16.840.1.101.3.4.2.1", () => {
		const oid = [2, 16, 840, 1, 101, 3, 4, 2, 1];
		const encoded = berEncode(def, oid);
		expect(encoded[0]).toBe(0x06); // OID tag
		const decoded = berDecode(def, encoded);
		expect(decoded).toEqual(oid);
	});
	it("encodes commonName 2.5.4.3", () => {
		const oid = [2, 5, 4, 3];
		expect(berDecode(def, berEncode(def, oid))).toEqual(oid);
	});
});

describe("BER UTF8String", () => {
	const def = ref(utf8String());
	it("round-trips ASCII", () => {
		expect(berDecode(def, berEncode(def, "Hello"))).toBe("Hello");
	});
	it("round-trips Unicode", () => {
		expect(berDecode(def, berEncode(def, "caf\u00e9"))).toBe("caf\u00e9");
	});
});

describe("BER ENUMERATED", () => {
	const def = ref(enumerated());
	it("round-trips named values", () => {
		for (const v of [0n, 1n, 2n]) {
			expect(berDecode(def, berEncode(def, v))).toBe(v);
		}
	});
});

describe("BER SEQUENCE", () => {
	const algo = sequence([
		component("algorithm", objectIdentifier()),
		component("parameters", nullType).optional(),
	] as const);
	const def: AnyAsn1TypeDef = ref(algo);

	it("encodes AlgorithmIdentifier with parameters present", () => {
		const value = {
			algorithm: [2, 16, 840, 1, 101, 3, 4, 2, 1],
			parameters: null,
		};
		const encoded = berEncode(def, value);
		expect(encoded[0]).toBe(0x30); // SEQUENCE tag
		const decoded = berDecode(def, encoded);
		expect(decoded.algorithm).toEqual([2, 16, 840, 1, 101, 3, 4, 2, 1]);
		expect(decoded.parameters).toBeNull();
	});

	it("omits OPTIONAL absent fields", () => {
		const value = { algorithm: [2, 5, 4, 3] };
		const encoded = berEncode(def, value);
		const decoded = berDecode(def, encoded);
		expect(decoded.algorithm).toEqual([2, 5, 4, 3]);
		expect(decoded.parameters).toBeUndefined();
	});
});

describe("BER CHOICE", () => {
	const timeDef = ref(
		choice([
			alternative("utcTime", contextImplicitTag(0, utf8String())),
			alternative("generalTime", contextImplicitTag(1, utf8String())),
		] as const),
	);

	it("encodes and decodes the correct alternative", () => {
		const value = { kind: "utcTime" as const, value: "240101000000Z" };
		const encoded = berEncode(timeDef, value);
		const decoded = berDecode(timeDef, encoded);
		expect(decoded.kind).toBe("utcTime");
		expect(decoded.value).toBe("240101000000Z");
	});
});

describe("BER tagged types", () => {
	it("EXPLICIT tag wraps the inner TLV", () => {
		const def = ref(contextTag(0, integer()));
		const encoded = berEncode(def, 42n);
		expect(encoded[0]).toBe(0xa0); // [0] EXPLICIT constructed
		const decoded = berDecode(def, encoded);
		expect(decoded).toBe(42n);
	});

	it("IMPLICIT tag replaces the inner tag", () => {
		const def = ref(contextImplicitTag(1, integer()));
		const encoded = berEncode(def, 42n);
		expect(encoded[0]).toBe(0x81); // [1] IMPLICIT primitive
		const decoded = berDecode(def, encoded);
		expect(decoded).toBe(42n);
	});
});
