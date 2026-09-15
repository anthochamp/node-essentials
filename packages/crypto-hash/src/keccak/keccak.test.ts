import {
	type CavpDigestCase,
	type CavpXofVariableOutputCase,
	parseCavpDigestRsp,
	parseCavpXofRsp,
	parseCavpXofVariableOutputRsp,
	readVectorFile,
} from "@ac-kit/fixture-crypto";
import { describe, expect, it } from "vitest";

import { sha3_224 } from "./sha3-224.js";
import { sha3_256 } from "./sha3-256.js";
import { sha3_384 } from "./sha3-384.js";
import { sha3_512 } from "./sha3-512.js";
import { shake128 } from "./shake128.js";
import { shake256 } from "./shake256.js";

/**
 * One test file, parametric over the whole Keccak family, instead of one
 * near-identical file per algorithm — SHA3-224/256/384/512 and SHAKE128/256
 * differ only in their `KeccakParameters` (rate + domain suffix, see
 * `_keccak-params.ts`) and, for SHAKE, in taking a variable output length.
 */
type Sha3Case = {
	readonly name: string;
	readonly fileNamePrefix: string;
	readonly hash: (data: Uint8Array) => Uint8Array;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
};

async function loadSha3Case(
	config: Omit<Sha3Case, "shortMsgCases" | "longMsgCases">,
): Promise<Sha3Case> {
	const [shortMsgCases, longMsgCases] = await Promise.all([
		readVectorFile(
			"cavp-sha3-byte-test-vectors",
			`${config.fileNamePrefix}ShortMsg.rsp`,
		).then(parseCavpDigestRsp),
		readVectorFile(
			"cavp-sha3-byte-test-vectors",
			`${config.fileNamePrefix}LongMsg.rsp`,
		).then(parseCavpDigestRsp),
	]);

	return { ...config, shortMsgCases, longMsgCases };
}

const SHA3_CASES: readonly Sha3Case[] = await Promise.all([
	loadSha3Case({
		name: "sha3_224",
		fileNamePrefix: "SHA3_224",
		hash: sha3_224,
	}),
	loadSha3Case({
		name: "sha3_256",
		fileNamePrefix: "SHA3_256",
		hash: sha3_256,
	}),
	loadSha3Case({
		name: "sha3_384",
		fileNamePrefix: "SHA3_384",
		hash: sha3_384,
	}),
	loadSha3Case({
		name: "sha3_512",
		fileNamePrefix: "SHA3_512",
		hash: sha3_512,
	}),
]);

describe.each(SHA3_CASES)(
	"$name against NIST CAVP SHA-3 vectors",
	(testCase) => {
		const { hash, shortMsgCases, longMsgCases } = testCase;

		it.each(shortMsgCases)(
			"ShortMsg Len=$lengthBits",
			({ message, digest }) => {
				expect(hash(message).toHex()).toBe(digest.toHex());
			},
		);

		it.each(longMsgCases)("LongMsg Len=$lengthBits", ({ message, digest }) => {
			expect(hash(message).toHex()).toBe(digest.toHex());
		});
	},
);

type ShakeCase = {
	readonly name: string;
	readonly fileNamePrefix: string;
	readonly hash: (data: Uint8Array, outputBytes: number) => Uint8Array;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
	readonly variableOutputCases: readonly CavpXofVariableOutputCase[];
};

async function loadShakeCase(
	config: Omit<
		ShakeCase,
		"shortMsgCases" | "longMsgCases" | "variableOutputCases"
	>,
): Promise<ShakeCase> {
	const [shortMsgCases, longMsgCases, variableOutputCases] = await Promise.all([
		readVectorFile(
			"cavp-shake-byte-test-vectors",
			`${config.fileNamePrefix}ShortMsg.rsp`,
		).then(parseCavpXofRsp),
		readVectorFile(
			"cavp-shake-byte-test-vectors",
			`${config.fileNamePrefix}LongMsg.rsp`,
		).then(parseCavpXofRsp),
		readVectorFile(
			"cavp-shake-byte-test-vectors",
			`${config.fileNamePrefix}VariableOut.rsp`,
		).then(parseCavpXofVariableOutputRsp),
	]);

	return { ...config, shortMsgCases, longMsgCases, variableOutputCases };
}

const SHAKE_CASES: readonly ShakeCase[] = await Promise.all([
	loadShakeCase({
		name: "shake128",
		fileNamePrefix: "SHAKE128",
		hash: shake128,
	}),
	loadShakeCase({
		name: "shake256",
		fileNamePrefix: "SHAKE256",
		hash: shake256,
	}),
]);

describe.each(SHAKE_CASES)(
	"$name against NIST CAVP SHAKE vectors, fixed output length",
	(testCase) => {
		const { hash, shortMsgCases, longMsgCases } = testCase;

		it.each(shortMsgCases)(
			"ShortMsg Len=$lengthBits",
			({ message, digest }) => {
				expect(hash(message, digest.length).toHex()).toBe(digest.toHex());
			},
		);

		it.each(longMsgCases)("LongMsg Len=$lengthBits", ({ message, digest }) => {
			expect(hash(message, digest.length).toHex()).toBe(digest.toHex());
		});
	},
);

describe.each(SHAKE_CASES)(
	"$name against NIST CAVP SHAKE vectors, variable output length",
	(testCase) => {
		const { hash, variableOutputCases } = testCase;

		it.each(variableOutputCases)(
			"Outputlen=$outputLengthBits",
			({ message, output }) => {
				expect(hash(message, output.length).toHex()).toBe(output.toHex());
			},
		);
	},
);

describe.each(SHAKE_CASES)("$name argument validation", (testCase) => {
	const { hash } = testCase;

	it.each([-1, 1.5, Number.NaN])(
		"throws a RangeError for outputBytes=%p",
		(outputBytes) => {
			expect(() => hash(new Uint8Array(0), outputBytes)).toThrow(RangeError);
		},
	);
});
