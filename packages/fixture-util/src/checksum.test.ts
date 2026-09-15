import { describe, expect, it } from "vitest";

import { verifyChecksum } from "./checksum.js";

describe("verifyChecksum", () => {
	const data = new TextEncoder().encode("abc");
	const correctSha256 =
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

	it("does not throw when the checksum matches", () => {
		expect(() => verifyChecksum(data, correctSha256, "test")).not.toThrow();
	});

	it("throws when the checksum does not match", () => {
		expect(() => verifyChecksum(data, "0".repeat(64), "test")).toThrow(
			/checksum mismatch/,
		);
	});
});
