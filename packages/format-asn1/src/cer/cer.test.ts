import { describe, expect, it } from "vitest";

import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import { contextImplicitTag, ref } from "../schema/types/base.js";
import { choice } from "../schema/types/constructed/choice.js";
import {
	alternative,
	component,
} from "../schema/types/constructed/component.js";
import { sequence } from "../schema/types/constructed/sequence.js";
import { boolean } from "../schema/types/primitives/boolean.js";
import { integer } from "../schema/types/primitives/integer.js";
import { octetString } from "../schema/types/primitives/octet-string.js";
import { utf8String } from "../schema/types/strings/utf8-string.js";
import { cerDecode } from "./decode.js";
import { cerEncode } from "./encode.js";

describe("CER BOOLEAN", () => {
	const def = ref(boolean());
	it("TRUE = 0xFF (same as DER)", () => {
		expect(cerEncode(def, true)).toEqual(new Uint8Array([0x01, 0x01, 0xff]));
	});
	it("round-trips", () => {
		expect(cerDecode(def, cerEncode(def, true))).toBe(true);
		expect(cerDecode(def, cerEncode(def, false))).toBe(false);
	});
});

describe("CER INTEGER", () => {
	const def = ref(integer());
	it("round-trips", () => {
		for (const v of [0n, 1n, -1n, 127n, 128n, -128n, 1000000n]) {
			expect(cerDecode(def, cerEncode(def, v))).toBe(v);
		}
	});
});

describe("CER OCTET STRING — large value uses indefinite-length chunking", () => {
	const def = ref(octetString());

	it("small value: definite-length encoding", () => {
		const v = new Uint8Array([0x01, 0x02, 0x03]);
		const encoded = cerEncode(def, v);
		expect(encoded[0]).toBe(0x04); // OCTET STRING primitive
		expect(cerDecode(def, encoded)).toEqual(v);
	});

	it("large value (> 1000 bytes): constructed indefinite-length encoding", () => {
		const v = new Uint8Array(1500).fill(0xaa);
		const encoded = cerEncode(def, v);
		// CER: constructed OCTET STRING (tag 0x24) for > 1000 bytes
		expect(encoded[0]).toBe(0x24); // constructed OCTET STRING
		expect(encoded[1]).toBe(0x80); // indefinite-length
		const decoded = cerDecode(def, encoded) as Uint8Array;
		expect(decoded).toEqual(v);
	});
});

describe("CER UTF8String — large value chunked", () => {
	const def = ref(utf8String());

	it("small string: primitive", () => {
		const encoded = cerEncode(def, "hello");
		expect(encoded[0]).toBe(0x0c); // UTF8String
		expect(cerDecode(def, encoded)).toBe("hello");
	});
});

describe("CER SEQUENCE — round-trip", () => {
	const AlgorithmIdentifier = sequence([
		component("algorithm", integer()),
		component("extra", utf8String()).optional(),
	] as const);
	const def: AnyAsn1TypeDef = ref(AlgorithmIdentifier);

	it("round-trips with optional field present", () => {
		const v = { algorithm: 42n, extra: "test" };
		const decoded = cerDecode(def, cerEncode(def, v));
		expect(decoded.algorithm).toBe(42n);
		expect(decoded.extra).toBe("test");
	});

	it("round-trips with optional field absent", () => {
		const v = { algorithm: 7n };
		const decoded = cerDecode(def, cerEncode(def, v));
		expect(decoded.algorithm).toBe(7n);
		expect(decoded.extra).toBeUndefined();
	});
});

describe("CER CHOICE", () => {
	const def = ref(
		choice([
			alternative("a", contextImplicitTag(0, integer())),
			alternative("b", contextImplicitTag(1, utf8String())),
		] as const),
	);

	it("encodes and decodes alternative a", () => {
		const v = { kind: "a" as const, value: 5n };
		const decoded = cerDecode(def, cerEncode(def, v));
		expect(decoded.kind).toBe("a");
		expect(decoded.value).toBe(5n);
	});
});

describe("CER — indefinite-length SEQUENCE", () => {
	// Build a SEQUENCE with > 1000 bytes of content
	const def = ref(sequence([component("data", octetString())] as const));

	it("large SEQUENCE uses indefinite-length encoding", () => {
		const v = { data: new Uint8Array(2000).fill(0xff) };
		const encoded = cerEncode(def, v);
		// SEQUENCE tag (0x30) followed by indefinite-length (0x80)
		expect(encoded[0]).toBe(0x30);
		expect(encoded[1]).toBe(0x80);
		// Ends with EOC (0x00 0x00)
		expect(encoded[encoded.length - 1]).toBe(0x00);
		expect(encoded[encoded.length - 2]).toBe(0x00);

		const decoded = cerDecode(def, encoded);
		expect(decoded.data).toEqual(v.data);
	});
});
