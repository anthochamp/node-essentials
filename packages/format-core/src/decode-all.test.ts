import { describe, expect, it } from "vitest";

import { decodeAll } from "./decode-all.js";
import type { Decoder } from "./decoder.js";

/** Decodes NUL-terminated tokens; "bad" is a recoverable error. */
const tokenDecoder: Decoder<string, Uint8Array> = {
	decode(view) {
		const at = view.indexOf(0);
		if (at === -1) return { status: "incomplete" };
		const text = new TextDecoder().decode(view.subarray(0, at));
		if (text === "bad") {
			return {
				status: "error",
				error: new Error("bad token"),
				consumed: at + 1,
			};
		}
		return { status: "decoded", value: text, consumed: at + 1 };
	},
};

describe("decodeAll", () => {
	it("decodes every value in a complete buffer", () => {
		const result = decodeAll(
			tokenDecoder,
			new TextEncoder().encode("a\0b\0c\0"),
		);
		expect(result.items.map((item) => item.value)).toStrictEqual([
			"a",
			"b",
			"c",
		]);
		expect(result.errors).toStrictEqual([]);
		expect(result.fatal).toBeUndefined();
		expect(result.truncated).toBe(false);
		expect(result.leftover).toHaveLength(0);
	});

	it("skips a recoverable error and continues, unlike a throw-on-first-bad-item decoder", () => {
		const result = decodeAll(
			tokenDecoder,
			new TextEncoder().encode("ok\0bad\0ok2\0"),
		);
		expect(result.items.map((item) => item.value)).toStrictEqual(["ok", "ok2"]);
		expect(result.errors).toHaveLength(1);
	});

	it("reports truncated with the dangling bytes as leftover", () => {
		const result = decodeAll(
			tokenDecoder,
			new TextEncoder().encode("ok\0dangling"),
		);
		expect(result.items.map((item) => item.value)).toStrictEqual(["ok"]);
		expect(result.truncated).toBe(true);
		expect(new TextDecoder().decode(result.leftover)).toBe("dangling");
	});

	it("stops at a fatal result and reports the remaining bytes as leftover", () => {
		const decoder: Decoder<string, Uint8Array> = {
			decode(view) {
				if (view.length > 0 && view[0] === 0x21 /* '!' */) {
					return { status: "fatal", error: new Error("boom") };
				}
				return tokenDecoder.decode(view, { atEof: false });
			},
		};
		const result = decodeAll(decoder, new TextEncoder().encode("ok\0!rest"));
		expect(result.items.map((item) => item.value)).toStrictEqual(["ok"]);
		expect(result.fatal).toBeInstanceOf(Error);
		expect(new TextDecoder().decode(result.leftover)).toBe("!rest");
	});
});
