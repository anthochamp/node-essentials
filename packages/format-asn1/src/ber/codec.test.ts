import { decodeAll } from "@ac-kit/format-core";
import { describe, expect, it } from "vitest";

import { ref } from "../schema/types/base.js";
import { integer } from "../schema/types/primitives/integer.js";
import { createBerDecoder, createBerEncoder } from "./codec.js";

const INTEGER = ref(integer());
const CONTEXT = { atEof: false };

describe("createBerDecoder", () => {
	it("decodes one framed value and reports its length as consumed", () => {
		const decoder = createBerDecoder(INTEGER);
		const encoded = createBerEncoder(INTEGER).encode(1n) as Uint8Array;

		expect(decoder.decode(encoded, CONTEXT)).toStrictEqual({
			status: "decoded",
			value: 1n,
			consumed: encoded.length,
		});
	});

	it("reports incomplete with the declared total when the value is short", () => {
		const decoder = createBerDecoder(INTEGER);
		const encoded = createBerEncoder(INTEGER).encode(1n) as Uint8Array;

		expect(decoder.decode(encoded.subarray(0, 2), CONTEXT)).toStrictEqual({
			status: "incomplete",
			needAtLeast: encoded.length,
		});
	});

	it("reports incomplete while the header itself is still arriving", () => {
		const decoder = createBerDecoder(INTEGER);
		expect(decoder.decode(new Uint8Array([0x02]), CONTEXT)).toStrictEqual({
			status: "incomplete",
		});
	});

	it("decodes back-to-back values from one buffer", () => {
		const encoder = createBerEncoder(INTEGER);
		const first = encoder.encode(1n) as Uint8Array;
		const second = encoder.encode(2n) as Uint8Array;
		const both = new Uint8Array(first.length + second.length);
		both.set(first);
		both.set(second, first.length);

		const result = decodeAll(createBerDecoder(INTEGER), both);

		expect(result.items.map((item) => item.value)).toStrictEqual([1n, 2n]);
		expect(result.truncated).toBe(false);
	});
});

describe("createBerEncoder", () => {
	it("round-trips through the decoding half", () => {
		const encoded = createBerEncoder(INTEGER).encode(42n) as Uint8Array;
		expect(createBerDecoder(INTEGER).decode(encoded, CONTEXT)).toMatchObject({
			status: "decoded",
			value: 42n,
		});
	});
});
