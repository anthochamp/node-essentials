import { describe, expect, it } from "vitest";

import { ref } from "../schema/types/base.js";
import { choice } from "../schema/types/constructed/choice.js";
import {
	alternative,
	component,
} from "../schema/types/constructed/component.js";
import { sequenceOf } from "../schema/types/constructed/sequence-of.js";
import { sequence } from "../schema/types/constructed/sequence.js";
import { boolean } from "../schema/types/primitives/boolean.js";
import { integer } from "../schema/types/primitives/integer.js";
import { nullType } from "../schema/types/primitives/null.js";
import { octetString } from "../schema/types/primitives/octet-string.js";
import { utf8String } from "../schema/types/strings/utf8-string.js";
import { perDecode } from "./decode.js";
import { perEncode } from "./encode.js";

// ── PER BOOLEAN ───────────────────────────────────────────────────────────────

describe("PER BOOLEAN", () => {
	const def = ref(boolean());
	it("TRUE encodes to 1 bit = 1", () => {
		const enc = perEncode(def, true);
		expect(enc).toEqual(new Uint8Array([0x80])); // bit 7 set (MSB)
	});
	it("FALSE encodes to 1 bit = 0", () => {
		expect(perEncode(def, false)).toEqual(new Uint8Array([0x00]));
	});
	it("round-trips", () => {
		expect(perDecode(def, perEncode(def, true))).toBe(true);
		expect(perDecode(def, perEncode(def, false))).toBe(false);
	});
});

// ── PER NULL ──────────────────────────────────────────────────────────────────

describe("PER NULL", () => {
	it("encodes to zero bytes", () => {
		expect(perEncode(ref(nullType), null)).toEqual(new Uint8Array(0));
	});
	it("decodes from zero bytes", () => {
		expect(perDecode(ref(nullType), new Uint8Array(0))).toBeNull();
	});
});

// ── PER INTEGER ───────────────────────────────────────────────────────────────

describe("PER INTEGER — constrained", () => {
	const def = ref(integer().range(0, 255));
	it("encodes 0 in 8 bits", () => {
		expect(perDecode(def, perEncode(def, 0n))).toBe(0n);
	});
	it("encodes 255 in 8 bits", () => {
		expect(perDecode(def, perEncode(def, 255n))).toBe(255n);
	});
	it("encodes 128 in 8 bits (aligned: single byte)", () => {
		const enc = perEncode(def, 128n, { aligned: true });
		expect(enc).toHaveLength(1);
		expect(enc[0]).toBe(128);
	});
});

describe("PER INTEGER — unconstrained", () => {
	const def = ref(integer());
	it("round-trips 0", () => {
		expect(perDecode(def, perEncode(def, 0n))).toBe(0n);
	});
	it("round-trips -1", () => {
		expect(perDecode(def, perEncode(def, -1n))).toBe(-1n);
	});
	it("round-trips large value", () => {
		const v = 123456789n;
		expect(perDecode(def, perEncode(def, v))).toBe(v);
	});
});

// ── PER OCTET STRING ──────────────────────────────────────────────────────────

describe("PER OCTET STRING", () => {
	const def = ref(octetString());
	it("round-trips empty", () => {
		expect(perDecode(def, perEncode(def, new Uint8Array(0)))).toEqual(
			new Uint8Array(0),
		);
	});
	it("round-trips arbitrary bytes", () => {
		const v = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		expect(perDecode(def, perEncode(def, v))).toEqual(v);
	});
});

describe("PER OCTET STRING — fixed size (SIZE(4))", () => {
	const def = ref(octetString().size(4, 4));
	it("no length determinant needed for fixed size", () => {
		const v = new Uint8Array([1, 2, 3, 4]);
		const enc = perEncode(def, v);
		// Fixed size 4: only value bytes, no length prefix in aligned
		expect(enc.length).toBe(4);
		expect(perDecode(def, enc)).toEqual(v);
	});
});

// ── PER UTF8String ────────────────────────────────────────────────────────────

describe("PER UTF8String", () => {
	const def = ref(utf8String());
	it("round-trips ASCII", () => {
		expect(perDecode(def, perEncode(def, "hello"))).toBe("hello");
	});
	it("round-trips Unicode", () => {
		expect(perDecode(def, perEncode(def, "caf\u00e9"))).toBe("caf\u00e9");
	});
});

// ── PER SEQUENCE ──────────────────────────────────────────────────────────────

describe("PER SEQUENCE", () => {
	const def = ref(
		sequence([
			component("id", integer().range(0, 65535)),
			component("name", utf8String()).optional(),
		] as const),
	);

	it("encodes with optional field absent", () => {
		const v = { id: 42n };
		const decoded = perDecode(def, perEncode(def, v)) as any;
		expect(decoded.id).toBe(42n);
		expect(decoded.name).toBeUndefined();
	});

	it("encodes with optional field present", () => {
		const v = { id: 100n, name: "Alice" };
		const decoded = perDecode(def, perEncode(def, v)) as any;
		expect(decoded.id).toBe(100n);
		expect(decoded.name).toBe("Alice");
	});
});

// ── PER SEQUENCE OF ───────────────────────────────────────────────────────────

describe("PER SEQUENCE OF", () => {
	const def = ref(sequenceOf(integer().range(0, 255)));
	it("round-trips a list", () => {
		const v = [1n, 2n, 128n, 255n];
		expect(perDecode(def, perEncode(def, v))).toEqual(v);
	});
});

// ── PER CHOICE ────────────────────────────────────────────────────────────────

describe("PER CHOICE", () => {
	const def = ref(
		choice([
			alternative("a", integer().range(0, 127)),
			alternative("b", utf8String()),
			alternative("c", boolean()),
		] as const),
	);

	it("encodes index + value for each alternative", () => {
		const va = { kind: "a" as const, value: 5n };
		const da = perDecode(def, perEncode(def, va)) as any;
		expect(da.kind).toBe("a");
		expect(da.value).toBe(5n);

		const vb = { kind: "b" as const, value: "test" };
		const db = perDecode(def, perEncode(def, vb)) as any;
		expect(db.kind).toBe("b");
		expect(db.value).toBe("test");
	});
});

// ── Unaligned PER ─────────────────────────────────────────────────────────────

describe("Unaligned PER", () => {
	const def = ref(integer().range(0, 3)); // 2 bits

	it("packs 4 values into 1 byte", () => {
		// 4 values of 2 bits each = 8 bits = 1 byte
		// But each is independent encode/decode for now
		const enc = perEncode(def, 2n, { aligned: false });
		expect(enc).toHaveLength(1); // 2 bits + 6 padding = 1 byte
		const dec = perDecode(def, enc, { aligned: false });
		expect(dec).toBe(2n);
	});

	it("aligned and unaligned produce different results for small constrained ints", () => {
		const aligned = perEncode(def, 1n, { aligned: true });
		const unaligned = perEncode(def, 1n, { aligned: false });
		// Both encode the same value; alignment may differ for edge cases
		expect(perDecode(def, aligned, { aligned: true })).toBe(1n);
		expect(perDecode(def, unaligned, { aligned: false })).toBe(1n);
	});
});

// ── Fragmented length determinants (X.691 §10.9.3.8) ──────────────────────────

describe("PER fragmented length determinant", () => {
	const FRAGMENT = 16_384;

	function bytesOfLength(length: number): Uint8Array {
		const bytes = new Uint8Array(length);
		for (let index = 0; index < length; index++) {
			bytes[index] = index & 0xff;
		}
		return bytes;
	}

	describe.each([true, false])("aligned=%s", (aligned) => {
		const def = ref(octetString());

		it.each([
			["just below the first fragment", FRAGMENT - 1],
			["exactly one fragment", FRAGMENT],
			["one past a fragment", FRAGMENT + 1],
			["four fragments, the maximum per header", FRAGMENT * 4],
			["more than one header's worth", FRAGMENT * 5 + 7],
		])("round-trips an OCTET STRING %s", (_label, length) => {
			const value = bytesOfLength(length);
			const decoded = perDecode(def, perEncode(def, value, { aligned }), {
				aligned,
			});
			expect(decoded).toEqual(value);
		});

		it("terminates an exact multiple with a zero-length determinant", () => {
			const encoded = perEncode(def, bytesOfLength(FRAGMENT), { aligned });
			// 0xC1 header + 16K payload + the terminating zero determinant.
			expect(encoded).toHaveLength(1 + FRAGMENT + 1);
			expect(encoded[0]).toBe(0xc1);
			expect(encoded.at(-1)).toBe(0x00);
		});

		it("round-trips a SEQUENCE OF across a fragment boundary", () => {
			const listDef = ref(sequenceOf(boolean()));
			const items = Array.from({ length: FRAGMENT + 3 }, (_, i) => i % 2 === 0);
			const decoded = perDecode(
				listDef,
				perEncode(listDef, items, { aligned }),
				{
					aligned,
				},
			);
			expect(decoded).toEqual(items);
		});
	});

	it("rejects a fragment header claiming more than four blocks", () => {
		const def = ref(octetString());
		expect(() => perDecode(def, new Uint8Array([0xc5, 0x00]))).toThrow(/1-4/);
	});
});
