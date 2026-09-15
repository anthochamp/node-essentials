/// <reference types="node" />
import { createHash } from "node:crypto";

import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { blake2b } from "./blake2b.js";
import { blake2s } from "./blake2s.js";

/**
 * `node:crypto`'s OpenSSL binding supports `"blake2b512"`/`"blake2s256"` — used
 * purely as an independent test oracle, the same role it plays for `sm3`.
 * BLAKE2 has no Web Crypto kernel (not part of that specification), so
 * `node:crypto` is never a _production_ kernel here — only imported in this
 * test file. Node can only compute the _default_ output length this way (`{
 * outputLength: N }` throws for BLAKE2, unlike SHAKE's XOF), so this oracle
 * only exercises `outputBytes` at its default.
 */
function blake2bViaNodeCrypto(data: Uint8Array): Uint8Array {
	return new Uint8Array(createHash("blake2b512").update(data).digest());
}

function blake2sViaNodeCrypto(data: Uint8Array): Uint8Array {
	return new Uint8Array(createHash("blake2s256").update(data).digest());
}

describe("blake2b against RFC 7693's worked example", () => {
	it('hashes "abc" (Appendix A)', () => {
		expect(blake2b(encodeTextUtf8("abc")).toHex()).toBe(
			"ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d" +
				"17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
		);
	});

	it("hashes the empty message", () => {
		expect(blake2b(new Uint8Array(0)).toHex()).toBe(
			"786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f541" +
				"9d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce",
		);
	});
});

describe("blake2s against RFC 7693's worked example", () => {
	it('hashes "abc"', () => {
		expect(blake2s(encodeTextUtf8("abc")).toHex()).toBe(
			"508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982",
		);
	});

	it("hashes the empty message", () => {
		expect(blake2s(new Uint8Array(0)).toHex()).toBe(
			"69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9",
		);
	});
});

describe("blake2b differential: TS kernel vs node:crypto's OpenSSL binding", () => {
	it("agrees across random inputs spanning the 128-byte block boundary", () => {
		for (const length of [0, 1, 127, 128, 129, 255, 256, 257, 1000]) {
			const message = crypto.getRandomValues(new Uint8Array(length));

			expect(blake2b(message).toHex()).toBe(
				blake2bViaNodeCrypto(message).toHex(),
			);
		}
	});
});

describe("blake2s differential: TS kernel vs node:crypto's OpenSSL binding", () => {
	it("agrees across random inputs spanning the 64-byte block boundary", () => {
		for (const length of [0, 1, 63, 64, 65, 127, 128, 129, 1000]) {
			const message = crypto.getRandomValues(new Uint8Array(length));

			expect(blake2s(message).toHex()).toBe(
				blake2sViaNodeCrypto(message).toHex(),
			);
		}
	});
});

describe("blake2b output length", () => {
	// `outputBytes` folds into BLAKE2's parameter-block XOR of the *initial*
	// state (RFC 7693 §3.3), not a post-hoc truncation of a fixed-length
	// digest — so these aren't prefixes of each other, unlike SHA-224 vs.
	// SHA-256. Cross-checked against CPython's `hashlib.blake2b(digest_size=n)`.
	it("matches an independent oracle at several digest lengths", () => {
		const message = new TextEncoder().encode("abc");
		const expected: Record<number, string> = {
			1: "6b",
			20: "384264f676f39536840523f284921cdc68b6846b",
			32: "bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319",
			63:
				"eb5324bb0b0f9ca27381f22f5e49604d7c341b77371fe5bf61fb643c8ab481c" +
				"7555ef17c9b9e7c92f0daafff6c0d748cab97d2b267bf53f8225c173ea26f3e",
			64:
				"ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d" +
				"17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
		};

		for (const [outputBytes, hex] of Object.entries(expected)) {
			expect(blake2b(message, Number(outputBytes)).toHex()).toBe(hex);
		}
	});

	it("rejects an out-of-range or non-integer outputBytes", () => {
		const message = new TextEncoder().encode("abc");

		expect(() => blake2b(message, 0)).toThrow(RangeError);
		expect(() => blake2b(message, 65)).toThrow(RangeError);
		expect(() => blake2b(message, 1.5)).toThrow(RangeError);
	});
});

describe("blake2s output length", () => {
	// See `blake2b output length`'s note above: not a truncation.
	// Cross-checked against CPython's `hashlib.blake2s(digest_size=n)`.
	it("matches an independent oracle at several digest lengths", () => {
		const message = new TextEncoder().encode("abc");
		const expected: Record<number, string> = {
			1: "0d",
			16: "aa4938119b1dc7b87cbad0ffd200d0ae",
			31: "6ffb901930ebaf1d3cabe0b60c20de3bc9dd26269325629f1671304fe6bb26",
			32: "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982",
		};

		for (const [outputBytes, hex] of Object.entries(expected)) {
			expect(blake2s(message, Number(outputBytes)).toHex()).toBe(hex);
		}
	});

	it("rejects an out-of-range or non-integer outputBytes", () => {
		const message = new TextEncoder().encode("abc");

		expect(() => blake2s(message, 0)).toThrow(RangeError);
		expect(() => blake2s(message, 33)).toThrow(RangeError);
		expect(() => blake2s(message, 1.5)).toThrow(RangeError);
	});
});
