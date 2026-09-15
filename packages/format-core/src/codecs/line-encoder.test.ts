import { concatBytes, decodeText, isTypedArray } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { createLineEncoder } from "./line-encoder.js";

describe("createLineEncoder", () => {
	it("encodes with a CRLF terminator", () => {
		const encoder = createLineEncoder("utf-8");
		const result = encoder.encode("hi");
		const buf = concatBytes(isTypedArray(result) ? [result] : result);

		expect(decodeText(buf, "utf-8")).toBe("hi\r\n");
	});

	it("honours a non-UTF-8 encoding", () => {
		const encoder = createLineEncoder("latin1");
		expect(encoder.encode("é")).toStrictEqual(
			new Uint8Array([0xe9, 0x0d, 0x0a]),
		);
	});
});
