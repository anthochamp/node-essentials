import { MaybePromiseLike } from "@ac-kit/core";
import {
	type CavpDigestCase,
	parseCavpDigestRsp,
	readVectorFile,
} from "@ac-kit/fixture-crypto";
import { describe, expect, it } from "vitest";

import { sha224 } from "./sha224.js";
import { sha256, sha256Ts } from "./sha256.js";
import { sha384, sha384Ts } from "./sha384.js";
import { sha512, sha512Ts } from "./sha512.js";

/**
 * One test file, parametric over every SHA-2 variant, instead of one
 * near-identical file per algorithm — each variant differs only in its IV and
 * output truncation (`Sha2_32Parameters`/`Sha2_64Parameters`, see
 * `_sha2-32-params.ts`/`_sha2-64-params.ts`), and, for three of the four, in
 * whether a Web Crypto kernel exists to differentially test against.
 */
type WebCryptoCase = {
	readonly algorithmName: string;
	/** Message lengths straddling the block boundary, in bytes. */
	readonly lengths: readonly number[];
	readonly asyncHash: (
		data: Uint8Array<ArrayBuffer>,
	) => MaybePromiseLike<Uint8Array<ArrayBuffer>>;
	readonly knownAbcHex: string;
};

type Sha2Case = {
	readonly name: string;
	/** The CAVP vector file prefix, e.g. `"SHA224"` for `SHA224ShortMsg.rsp`. */
	readonly fileNamePrefix: string;
	readonly hash: (data: Uint8Array) => Uint8Array;
	readonly webCrypto?: WebCryptoCase;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
};

async function loadCase(
	config: Omit<Sha2Case, "shortMsgCases" | "longMsgCases">,
): Promise<Sha2Case> {
	const [shortMsgCases, longMsgCases] = await Promise.all([
		readVectorFile(
			"cavp-shs-byte-test-vectors",
			`shabytetestvectors/${config.fileNamePrefix}ShortMsg.rsp`,
		).then(parseCavpDigestRsp),
		readVectorFile(
			"cavp-shs-byte-test-vectors",
			`shabytetestvectors/${config.fileNamePrefix}LongMsg.rsp`,
		).then(parseCavpDigestRsp),
	]);

	return { ...config, shortMsgCases, longMsgCases };
}

const CASES: readonly Sha2Case[] = await Promise.all([
	loadCase({ name: "sha224", fileNamePrefix: "SHA224", hash: sha224 }),
	loadCase({
		name: "sha256Ts",
		fileNamePrefix: "SHA256",
		hash: sha256Ts,
		webCrypto: {
			algorithmName: "SHA-256",
			lengths: [0, 1, 55, 56, 63, 64, 65, 1000],
			asyncHash: sha256,
			knownAbcHex:
				"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		},
	}),
	loadCase({
		name: "sha384Ts",
		fileNamePrefix: "SHA384",
		hash: sha384Ts,
		webCrypto: {
			algorithmName: "SHA-384",
			lengths: [0, 1, 111, 112, 127, 128, 129, 1000],
			asyncHash: sha384,
			knownAbcHex:
				"cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
		},
	}),
	loadCase({
		name: "sha512Ts",
		fileNamePrefix: "SHA512",
		hash: sha512Ts,
		webCrypto: {
			algorithmName: "SHA-512",
			lengths: [0, 1, 111, 112, 127, 128, 129, 1000],
			asyncHash: sha512,
			knownAbcHex:
				"ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
		},
	}),
]);

describe.each(CASES)("$name against NIST CAVP SHAVS vectors", (testCase) => {
	const { hash, shortMsgCases, longMsgCases } = testCase;

	it.each(shortMsgCases)("ShortMsg Len=$lengthBits", ({ message, digest }) => {
		expect(hash(message).toHex()).toBe(digest.toHex());
	});

	it.each(longMsgCases)("LongMsg Len=$lengthBits", ({ message, digest }) => {
		expect(hash(message).toHex()).toBe(digest.toHex());
	});
});

describe.each(CASES.filter((testCase) => testCase.webCrypto !== undefined))(
	"$name differential: TS kernel vs Web Crypto",
	(testCase) => {
		const { hash, webCrypto } = testCase;
		const { algorithmName, lengths, asyncHash, knownAbcHex } = webCrypto!;

		it("agrees with crypto.subtle.digest across random inputs of many lengths", async () => {
			for (const length of lengths) {
				const message = crypto.getRandomValues(new Uint8Array(length));
				const expected = new Uint8Array(
					await crypto.subtle.digest(algorithmName, message),
				);

				expect(hash(message).toHex()).toBe(expected.toHex());
			}
		});

		it("returns a Promise when Web Crypto is available", async () => {
			const result = asyncHash(new TextEncoder().encode("abc"));

			expect(result).toBeInstanceOf(Promise);
			expect((await result).toHex()).toBe(knownAbcHex);
		});
	},
);
