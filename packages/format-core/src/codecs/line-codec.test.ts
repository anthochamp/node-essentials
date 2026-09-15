import { describe, expect, it } from "vitest";

import { createLineCodec } from "./line-codec.js";

const CONTEXT = { timedOut: false, atEof: false, atMessageBoundary: false };

describe("createLineCodec", () => {
	it("round-trips a value through both halves", () => {
		const codec = createLineCodec("utf-8");
		const encoded = codec.encode("hello") as Uint8Array;
		expect(codec.decode(encoded, CONTEXT)).toStrictEqual({
			status: "decoded",
			value: "hello",
			consumed: 7,
		});
	});

	it("passes decoder options through to the decoding half", () => {
		const codec = createLineCodec("utf-8", { maxLineLength: 3 });
		expect(
			codec.decode(new TextEncoder().encode("toolong\n"), CONTEXT).status,
		).toBe("error");
	});

	it("reset() clears the decoder half's partial-line state", () => {
		const codec = createLineCodec("utf-8");
		codec.decode(new TextEncoder().encode("partial"), CONTEXT);
		codec.reset?.();
		expect(
			codec.decode(new TextEncoder().encode("hi\n"), CONTEXT),
		).toStrictEqual({ status: "decoded", value: "hi", consumed: 3 });
	});
});
