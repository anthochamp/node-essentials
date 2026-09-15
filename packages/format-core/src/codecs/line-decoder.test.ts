import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { LineDecoder } from "./line-decoder.js";

describe("LineDecoder", () => {
	it("decodes a CRLF-terminated line, stripping the CR", () => {
		const decoder = new LineDecoder("utf-8");
		const result = decoder.decode(encodeTextUtf8("hello\r\n"));
		expect(result).toStrictEqual({
			status: "decoded",
			value: "hello",
			consumed: 7,
		});
	});

	it("decodes a bare-LF line", () => {
		const decoder = new LineDecoder("utf-8");
		const result = decoder.decode(encodeTextUtf8("hello\n"));
		expect(result).toStrictEqual({
			status: "decoded",
			value: "hello",
			consumed: 6,
		});
	});

	it("reports incomplete with no terminator yet", () => {
		const decoder = new LineDecoder("utf-8");
		expect(decoder.decode(encodeTextUtf8("hello"))).toStrictEqual({
			status: "incomplete",
		});
	});

	it("reports a recoverable error on overflow by default", () => {
		const decoder = new LineDecoder("utf-8", { maxLineLength: 3 });
		const result = decoder.decode(encodeTextUtf8("toolong\n"));
		expect(result.status).toBe("error");
	});

	it("reports fatal on overflow when configured", () => {
		const decoder = new LineDecoder("utf-8", {
			maxLineLength: 3,
			fatalOnOverflow: true,
		});
		const result = decoder.decode(encodeTextUtf8("toolong\n"));
		expect(result.status).toBe("fatal");
	});

	it("reset() clears the partial-line scan position", () => {
		const decoder = new LineDecoder("utf-8");
		decoder.decode(encodeTextUtf8("partial"));
		decoder.reset();
		// A shorter view after reset must still be scanned from the front.
		expect(decoder.decode(encodeTextUtf8("hi\n"))).toStrictEqual({
			status: "decoded",
			value: "hi",
			consumed: 3,
		});
	});
});
