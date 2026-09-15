/// <reference types="node" />
import { createHash } from "node:crypto";

import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { md5 } from "./md5.js";
import { ripemd160 } from "./ripemd160.js";
import { sha1Js } from "./sha1-js.js";

/**
 * One test file, parametric over the three legacy hashes — see
 * `_md5-core.ts`/`_sha1-core.ts`/`_ripemd160-core.ts`'s module docs for why
 * each is legacy-only. `node:crypto`'s OpenSSL binding supports all three —
 * used purely as an independent test oracle for the differential checks (the
 * same role it plays for SM3); `sha1Ts` is used rather than `sha1` (which
 * prefers Web Crypto) so this file exercises the TS kernel specifically,
 * matching `md5`/`ripemd160`, which have no Web Crypto kernel at all.
 */
type LegacyHashCase = {
	readonly name: string;
	readonly hash: (data: Uint8Array) => Uint8Array;
	readonly nodeAlgorithm: string;
	readonly vectors: Readonly<Record<string, string>>;
};

const CASES: readonly LegacyHashCase[] = [
	{
		name: "md5",
		hash: md5,
		nodeAlgorithm: "md5",
		// RFC 1321 §A.5.
		vectors: {
			"": "d41d8cd98f00b204e9800998ecf8427e",
			a: "0cc175b9c0f1b6a831c399e269772661",
			abc: "900150983cd24fb0d6963f7d28e17f72",
			"message digest": "f96b697d7cb7938d525a2f31aaf161d0",
			abcdefghijklmnopqrstuvwxyz: "c3fcd3d76192e4007dfb496cca67e13b",
			ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:
				"d174ab98d277d9f5a5611c2c9f419d9f",
			"12345678901234567890123456789012345678901234567890123456789012345678901234567890":
				"57edf4a22be3c955ac49da2e2107b67a",
		},
	},
	{
		name: "sha1",
		hash: sha1Js,
		nodeAlgorithm: "sha1",
		// FIPS 180-4 §D (three worked examples).
		vectors: {
			"": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
			abc: "a9993e364706816aba3e25717850c26c9cd0d89d",
			abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq:
				"84983e441c3bd26ebaae4aa1f95129e5e54670f1",
		},
	},
	{
		name: "ripemd160",
		hash: ripemd160,
		nodeAlgorithm: "ripemd160",
		// Official test vectors published by the algorithm's own authors at
		// https://homes.esat.kuleuven.be/~bosselae/ripemd160.html.
		vectors: {
			"": "9c1185a5c5e9fc54612808977ee8f548b2258d31",
			a: "0bdc9d2d256b3ee9daae347be6f4dc835a467ffe",
			abc: "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
			"message digest": "5d0689ef49d2fae572b881b123a85ffa21595f36",
			abcdefghijklmnopqrstuvwxyz: "f71c27109c692c1b56bbdceb5b9d2865b3708dbc",
		},
	},
];

describe.each(CASES)("$name against the official test vectors", (testCase) => {
	const { hash, vectors } = testCase;

	it.each(Object.entries(vectors))('hashes "%s"', (message, expectedHex) => {
		expect(hash(encodeTextUtf8(message)).toHex()).toBe(expectedHex);
	});
});

describe.each(CASES)(
	"$name differential: TS kernel vs node:crypto's OpenSSL binding",
	(testCase) => {
		const { hash, nodeAlgorithm } = testCase;

		it("agrees across random inputs of many lengths", () => {
			for (const length of [0, 1, 55, 56, 63, 64, 65, 1000]) {
				const message = crypto.getRandomValues(new Uint8Array(length));
				const expected = createHash(nodeAlgorithm).update(message).digest();

				expect(hash(message).toHex()).toBe(expected.toHex());
			}
		});
	},
);
