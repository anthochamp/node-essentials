/// <reference types="node" />
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { sm3 } from "./sm3.js";

/**
 * Node's OpenSSL binding supports `"sm3"` as a digest (OpenSSL 1.1.1+) — used
 * here purely as an independent test oracle, the same role `crypto.subtle`
 * plays for `sha256`/`sha384`/`sha512`. SM3 has no Web Crypto kernel (not part
 * of that specification), so unlike those, `node:crypto` is never a
 * _production_ kernel for `sm3` — only ever imported here, in the test file.
 */
function sm3ViaNodeCrypto(data: Uint8Array): Uint8Array {
	return new Uint8Array(createHash("sm3").update(data).digest());
}

describe("sm3 against the official GB/T 32905-2016 worked examples", () => {
	it('hashes "abc" (Example 1)', () => {
		expect(sm3(new TextEncoder().encode("abc")).toHex()).toBe(
			"66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0",
		);
	});

	it('hashes "abcd" x16 — exactly one block before padding (Example 2)', () => {
		const message = new TextEncoder().encode("abcd".repeat(16));

		expect(sm3(message).toHex()).toBe(
			"debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732",
		);
	});
});

describe("sm3 differential: TS kernel vs node:crypto's OpenSSL binding", () => {
	it("agrees across random inputs of many lengths", () => {
		for (const length of [0, 1, 55, 56, 63, 64, 65, 1000]) {
			const message = crypto.getRandomValues(new Uint8Array(length));

			expect(sm3(message).toHex()).toBe(sm3ViaNodeCrypto(message).toHex());
		}
	});
});
