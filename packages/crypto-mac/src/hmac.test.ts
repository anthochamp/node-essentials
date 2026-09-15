/// <reference types="node" />
import { createHmac } from "node:crypto";

import { sha256Ts } from "@ac-kit/crypto-hash";
import { readVectorFile } from "@ac-kit/fixture-crypto";
import { describe, expect, it } from "vitest";

import { hmac, hmacVerify } from "./hmac-core.js";
import { hmacMd5 } from "./hmac-md5.js";
import { hmacSha1Ts } from "./hmac-sha1.js";
import { hmacSha224 } from "./hmac-sha224.js";
import { hmacSha256Ts } from "./hmac-sha256.js";
import { hmacSha384Ts } from "./hmac-sha384.js";
import { hmacSha512Ts } from "./hmac-sha512.js";

function ascii(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function repeatByte(byte: number, times: number): Uint8Array {
	return new Uint8Array(times).fill(byte);
}

type HmacKatCase = {
	readonly name: string;
	readonly key: Uint8Array;
	readonly message: Uint8Array;
	readonly tag: string;
};

// RFC 2202 §2. MD5 and SHA-1 use different key lengths for the same "0x0b" /
// "0xaa" / "0x0c" repeated-byte keys in cases 1, 3, and 5 (16 vs 20 bytes) —
// the two algorithms can't share one vector list the way RFC 4231's SHA-2
// cases do below.
const RFC2202_MD5_CASES: readonly HmacKatCase[] = [
	{
		name: "test case 1",
		key: repeatByte(0x0b, 16),
		message: ascii("Hi There"),
		tag: "9294727a3638bb1c13f48ef8158bfc9d",
	},
	{
		name: "test case 2 — key shorter than a block",
		key: ascii("Jefe"),
		message: ascii("what do ya want for nothing?"),
		tag: "750c783e6ab0b503eaa86e310a5db738",
	},
	{
		name: "test case 3",
		key: repeatByte(0xaa, 16),
		message: repeatByte(0xdd, 50),
		tag: "56be34521d144c88dbb8c733f0e8b3f6",
	},
	{
		name: "test case 4",
		key: Uint8Array.fromHex(
			"0102030405060708090a0b0c0d0e0f10111213141516171819",
		),
		message: repeatByte(0xcd, 50),
		tag: "697eaf0aca3a3aea3a75164746ffaa79",
	},
	{
		name: "test case 5",
		key: repeatByte(0x0c, 16),
		message: ascii("Test With Truncation"),
		tag: "56461ef2342edc00f9bab995690efd4c",
	},
	{
		name: "test case 6 — key larger than a block",
		key: repeatByte(0xaa, 80),
		message: ascii("Test Using Larger Than Block-Size Key - Hash Key First"),
		tag: "6b1ab7fe4bd7bf8f0b62e6ce61b9d0cd",
	},
	{
		name: "test case 7 — key and data larger than a block",
		key: repeatByte(0xaa, 80),
		message: ascii(
			"Test Using Larger Than Block-Size Key and Larger Than One Block-Size Data",
		),
		tag: "6f630fad67cda0ee1fb1f562db3aa53e",
	},
];

// RFC 2202 §3.
const RFC2202_SHA1_CASES: readonly HmacKatCase[] = [
	{
		name: "test case 1",
		key: repeatByte(0x0b, 20),
		message: ascii("Hi There"),
		tag: "b617318655057264e28bc0b6fb378c8ef146be00",
	},
	{
		name: "test case 2 — key shorter than a block",
		key: ascii("Jefe"),
		message: ascii("what do ya want for nothing?"),
		tag: "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79",
	},
	{
		name: "test case 3",
		key: repeatByte(0xaa, 20),
		message: repeatByte(0xdd, 50),
		tag: "125d7342b9ac11cd91a39af48aa17b4f63f175d3",
	},
	{
		name: "test case 4",
		key: Uint8Array.fromHex(
			"0102030405060708090a0b0c0d0e0f10111213141516171819",
		),
		message: repeatByte(0xcd, 50),
		tag: "4c9007f4026250c6bc8414f9bf50c86c2d7235da",
	},
	{
		name: "test case 5",
		key: repeatByte(0x0c, 20),
		message: ascii("Test With Truncation"),
		tag: "4c1a03424b55e07fe7f27be1d58bb9324a9a5a04",
	},
	{
		name: "test case 6 — key larger than a block",
		key: repeatByte(0xaa, 80),
		message: ascii("Test Using Larger Than Block-Size Key - Hash Key First"),
		tag: "aa4ae5e15272d00e95705637ce8a3b55ed402112",
	},
	{
		name: "test case 7 — key and data larger than a block",
		key: repeatByte(0xaa, 80),
		message: ascii(
			"Test Using Larger Than Block-Size Key and Larger Than One Block-Size Data",
		),
		tag: "e8e99d0f45237d786d6bbaa7965c7808bbff1a91",
	},
];

type Rfc4231Case = {
	readonly name: string;
	readonly key: Uint8Array;
	readonly message: Uint8Array;
	readonly sha224: string;
	readonly sha256: string;
	readonly sha384: string;
	readonly sha512: string;
};

// RFC 4231 §4 — one shared key/message per test case, since all four SHA-2
// variants are exercised against it (only the expected tag differs). Test
// case 5 is omitted: RFC 4231 only publishes it truncated to 128 bits, and
// `hmac()`'s `tagLengthBytes` truncation is already exercised generically by
// the Wycheproof 128-bit-tag groups below.
const RFC4231_CASES: readonly Rfc4231Case[] = [
	{
		name: "test case 1",
		key: repeatByte(0x0b, 20),
		message: ascii("Hi There"),
		sha224: "896fb1128abbdf196832107cd49df33f47b4b1169912ba4f53684b22",
		sha256: "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
		sha384:
			"afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6",
		sha512:
			"87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854",
	},
	{
		name: "test case 2 — key shorter than a block",
		key: ascii("Jefe"),
		message: ascii("what do ya want for nothing?"),
		sha224: "a30e01098bc6dbbf45690f3a7e9e6d0f8bbea2a39e6148008fd05e44",
		sha256: "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
		sha384:
			"af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
		sha512:
			"164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
	},
	{
		name: "test case 3 — combined key/data length larger than one block",
		key: repeatByte(0xaa, 20),
		message: repeatByte(0xdd, 50),
		sha224: "7fb3cb3588c6c1f6ffa9694d7d6ad2649365b0c1f65d69d1ec8333ea",
		sha256: "773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe",
		sha384:
			"88062608d3e6ad8a0aa2ace014c8a86f0aa635d947ac9febe83ef4e55966144b2a5ab39dc13814b94e3ab6e101a34f27",
		sha512:
			"fa73b0089d56a284efb0f0756c890be9b1b5dbdd8ee81a3655f83e33b2279d39bf3e848279a722c806b485a47e67c807b946a337bee8942674278859e13292fb",
	},
	{
		name: "test case 4",
		key: Uint8Array.fromHex(
			"0102030405060708090a0b0c0d0e0f10111213141516171819",
		),
		message: repeatByte(0xcd, 50),
		sha224: "6c11506874013cac6a2abc1bb382627cec6a90d86efc012de7afec5a",
		sha256: "82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b",
		sha384:
			"3e8a69b7783c25851933ab6290af6ca77a9981480850009cc5577c6e1f573b4e6801dd23c4a7d679ccf8a386c674cffb",
		sha512:
			"b0ba465637458c6990e5a8c5f61d4af7e576d97ff94b872de76f8050361ee3dba91ca5c11aa25eb4d679275cc5788063a5f19741120c4f2de2adebeb10a298dd",
	},
	{
		name: "test case 6 — key larger than a block",
		key: repeatByte(0xaa, 131),
		message: ascii("Test Using Larger Than Block-Size Key - Hash Key First"),
		sha224: "95e9a0db962095adaebe9b2d6f0dbce2d499f112f2d2b7273fa6870e",
		sha256: "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54",
		sha384:
			"4ece084485813e9088d2c63a041bc5b44f9ef1012a2b588f3cd11f05033ac4c60c2ef6ab4030fe8296248df163f44952",
		sha512:
			"80b24263c7c1a3ebb71493c1dd7be8b49b46d1f41b4aeec1121b013783f8f3526b56d037e05f2598bd0fd2215d6a1e5295e64f73f63f0aec8b915a985d786598",
	},
	{
		name: "test case 7 — key and data larger than a block",
		key: repeatByte(0xaa, 131),
		message: ascii(
			"This is a test using a larger than block-size key and a larger " +
				"than block-size data. The key needs to be hashed before being " +
				"used by the HMAC algorithm.",
		),
		sha224: "3a854166ac5d9f023f54d517d0b39dbd946770db9c2b95c9f6f565d1",
		sha256: "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2",
		sha384:
			"6617178e941f020d351e2f254e8fd32c602420feb0b8fb9adccebb82461e99c5a678cc31e799176d3860e6110c46523e",
		sha512:
			"e37b6a775dc87dbaa4dfa9f96e5e3ffddebd71f8867289865df5a32d20cdc944b6022cac3c4982b10d5eeb55c3e4de15134676fb6de0446065c97440fa8c6a58",
	},
];

describe("HMAC-MD5 against RFC 2202's own test vectors", () => {
	it.each(RFC2202_MD5_CASES)("$name", (testCase) => {
		expect(hmacMd5(testCase.key, testCase.message).toHex()).toBe(testCase.tag);
	});
});

describe("HMAC-SHA-1 against RFC 2202's own test vectors", () => {
	it.each(RFC2202_SHA1_CASES)("$name", (testCase) => {
		expect(hmacSha1Ts(testCase.key, testCase.message).toHex()).toBe(
			testCase.tag,
		);
	});
});

describe("HMAC-SHA-2 family against RFC 4231's own test vectors", () => {
	it.each(RFC4231_CASES)("$name", (testCase) => {
		expect(hmacSha224(testCase.key, testCase.message).toHex()).toBe(
			testCase.sha224,
		);
		expect(hmacSha256Ts(testCase.key, testCase.message).toHex()).toBe(
			testCase.sha256,
		);
		expect(hmacSha384Ts(testCase.key, testCase.message).toHex()).toBe(
			testCase.sha384,
		);
		expect(hmacSha512Ts(testCase.key, testCase.message).toHex()).toBe(
			testCase.sha512,
		);
	});
});

type LegacyDifferentialCase = {
	readonly name: string;
	readonly hmacFn: (key: Uint8Array, message: Uint8Array) => Uint8Array;
	readonly nodeAlgorithm: string;
};

const DIFFERENTIAL_CASES: readonly LegacyDifferentialCase[] = [
	{ name: "hmacMd5", hmacFn: hmacMd5, nodeAlgorithm: "md5" },
	{ name: "hmacSha1Ts", hmacFn: hmacSha1Ts, nodeAlgorithm: "sha1" },
	{ name: "hmacSha224", hmacFn: hmacSha224, nodeAlgorithm: "sha224" },
	{ name: "hmacSha256Ts", hmacFn: hmacSha256Ts, nodeAlgorithm: "sha256" },
	{ name: "hmacSha384Ts", hmacFn: hmacSha384Ts, nodeAlgorithm: "sha384" },
	{ name: "hmacSha512Ts", hmacFn: hmacSha512Ts, nodeAlgorithm: "sha512" },
];

describe.each(DIFFERENTIAL_CASES)(
	"$name differential: TS kernel vs node:crypto's OpenSSL binding",
	(testCase) => {
		const { hmacFn, nodeAlgorithm } = testCase;

		it("agrees across random key/message lengths spanning the block boundary", () => {
			for (const keyLength of [0, 1, 20, 64, 65, 128, 200]) {
				for (const messageLength of [0, 1, 55, 64, 65, 1000]) {
					const key = crypto.getRandomValues(new Uint8Array(keyLength));
					const message = crypto.getRandomValues(new Uint8Array(messageLength));
					const expected = createHmac(nodeAlgorithm, key)
						.update(message)
						.digest();

					expect(hmacFn(key, message).toHex()).toBe(expected.toHex());
				}
			}
		});
	},
);

describe("hmacVerify", () => {
	it("accepts a correct tag and rejects a tampered one", () => {
		const key = ascii("key");
		const message = ascii("message");
		const tag = hmac(sha256Ts, 64, key, message);
		const tamperedTag = tag.slice();
		tamperedTag[0] = tamperedTag[0]! ^ 0xff;

		expect(hmacVerify(sha256Ts, 64, key, message, tag)).toBe(true);
		expect(hmacVerify(sha256Ts, 64, key, message, tamperedTag)).toBe(false);
	});

	it("rejects a tag of the wrong length rather than throwing", () => {
		const key = ascii("key");
		const message = ascii("message");

		expect(hmacVerify(sha256Ts, 64, key, message, new Uint8Array(31))).toBe(
			false,
		);
	});

	it("verifies a truncated tag produced with a matching tagLengthBytes", () => {
		const key = ascii("key");
		const message = ascii("message");
		const truncatedTag = hmac(sha256Ts, 64, key, message, 16);

		expect(truncatedTag.length).toBe(16);
		expect(hmacVerify(sha256Ts, 64, key, message, truncatedTag)).toBe(true);
	});
});

type WycheproofHmacTest = {
	readonly tcId: number;
	readonly comment: string;
	readonly key: string;
	readonly msg: string;
	readonly tag: string;
	readonly result: "valid" | "invalid";
};

type WycheproofHmacGroup = {
	readonly keySize: number;
	readonly tagSize: number;
	readonly tests: readonly WycheproofHmacTest[];
};

type WycheproofHmacFile = {
	readonly testGroups: readonly WycheproofHmacGroup[];
};

const wycheproofJson = await readVectorFile(
	"wycheproof-hmac-sha256",
	"hmac_sha256_test.json",
);
const wycheproofData = JSON.parse(wycheproofJson) as WycheproofHmacFile;

describe("HMAC-SHA-256 against Wycheproof's MacTest vectors", () => {
	describe.each(wycheproofData.testGroups)(
		"key size $keySize bits, tag size $tagSize bits",
		(group) => {
			it.each(group.tests)("tcId $tcId: $comment ($result)", (testCase) => {
				const key = Uint8Array.fromHex(testCase.key);
				const message = Uint8Array.fromHex(testCase.msg);
				const tag = Uint8Array.fromHex(testCase.tag);

				const verified = hmacVerify(sha256Ts, 64, key, message, tag);

				if (testCase.result === "valid") {
					expect(verified).toBe(true);
					expect(hmac(sha256Ts, 64, key, message, tag.length).toHex()).toBe(
						testCase.tag,
					);
				} else {
					expect(verified).toBe(false);
				}
			});
		},
	);
});
