import {
	type CavpDigestCase,
	parseCavpDigestRsp,
	readVectorFile,
} from "@ac-kit/fixture-crypto";
import { describe, expect, it } from "vitest";

import { Sha224Sink } from "./sha224-sink.js";
import { sha224 } from "./sha224.js";
import { Sha256Sink } from "./sha256-sink.js";
import { sha256Ts } from "./sha256.js";
import { Sha384Sink } from "./sha384-sink.js";
import { sha384Ts } from "./sha384.js";
import { Sha512Sink } from "./sha512-sink.js";
import { sha512Ts } from "./sha512.js";

type DigestSink = WritableStream<Uint8Array> & {
	readonly digest: Promise<Uint8Array>;
};

/**
 * One test file, parametric over every SHA-2 sink, instead of one
 * near-identical file per algorithm — each sink differs only in which
 * `Sha2_32Sink`/`Sha2_64Sink` preset it configures, its block size, and its
 * one-shot counterpart to differentially check against.
 */
type Sha2SinkCase = {
	readonly name: string;
	readonly fileNamePrefix: string;
	readonly createSink: () => DigestSink;
	readonly oneShotHash: (data: Uint8Array) => Uint8Array;
	readonly chunkSizes: readonly number[];
	readonly boundaryMessageLength: number;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
};

async function loadCase(
	config: Omit<Sha2SinkCase, "shortMsgCases" | "longMsgCases">,
): Promise<Sha2SinkCase> {
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

/**
 * Writes `message` to `sink` split into `chunkSize`-byte pieces, to exercise
 * the tail-buffering logic across an arbitrary number of `write()` calls rather
 * than always landing on a block boundary.
 */
async function hashInChunks(
	sink: DigestSink,
	message: Uint8Array,
	chunkSize: number,
): Promise<Uint8Array> {
	const writer = sink.getWriter();

	for (let offset = 0; offset < message.length; offset += chunkSize) {
		await writer.write(message.subarray(offset, offset + chunkSize));
	}

	await writer.close();

	return sink.digest;
}

const CASES: readonly Sha2SinkCase[] = await Promise.all([
	loadCase({
		name: "Sha224Sink",
		fileNamePrefix: "SHA224",
		createSink: () => new Sha224Sink(),
		oneShotHash: sha224,
		chunkSizes: [1, 3, 7, 63, 64, 65, 127, 200],
		boundaryMessageLength: 500,
	}),
	loadCase({
		name: "Sha256Sink",
		fileNamePrefix: "SHA256",
		createSink: () => new Sha256Sink(),
		oneShotHash: sha256Ts,
		chunkSizes: [1, 3, 7, 63, 64, 65, 127, 200],
		boundaryMessageLength: 500,
	}),
	loadCase({
		name: "Sha384Sink",
		fileNamePrefix: "SHA384",
		createSink: () => new Sha384Sink(),
		oneShotHash: sha384Ts,
		chunkSizes: [1, 3, 7, 127, 128, 129, 255, 400],
		boundaryMessageLength: 1000,
	}),
	loadCase({
		name: "Sha512Sink",
		fileNamePrefix: "SHA512",
		createSink: () => new Sha512Sink(),
		oneShotHash: sha512Ts,
		chunkSizes: [1, 3, 7, 127, 128, 129, 255, 400],
		boundaryMessageLength: 1000,
	}),
]);

describe.each(CASES)(
	"$name against NIST CAVP SHAVS vectors, one write per message",
	(testCase) => {
		const { createSink, shortMsgCases, longMsgCases } = testCase;

		it.each(shortMsgCases)(
			"ShortMsg Len=$lengthBits",
			async ({ message, digest }) => {
				const hashed = await hashInChunks(
					createSink(),
					message,
					message.length || 1,
				);

				expect(hashed.toHex()).toBe(digest.toHex());
			},
		);

		it.each(longMsgCases)(
			"LongMsg Len=$lengthBits",
			async ({ message, digest }) => {
				const hashed = await hashInChunks(
					createSink(),
					message,
					message.length || 1,
				);

				expect(hashed.toHex()).toBe(digest.toHex());
			},
		);
	},
);

describe.each(CASES)(
	"$name, chunk boundaries independent of block size",
	(testCase) => {
		const { createSink, oneShotHash, chunkSizes, boundaryMessageLength } =
			testCase;

		it.each(chunkSizes)(
			"matches the one-shot digest split into %i-byte writes",
			async (chunkSize) => {
				const message = crypto.getRandomValues(
					new Uint8Array(boundaryMessageLength),
				);
				const hashed = await hashInChunks(createSink(), message, chunkSize);

				expect(hashed.toHex()).toBe(oneShotHash(message).toHex());
			},
		);

		it("matches the one-shot digest for an empty message", async () => {
			const hashed = await hashInChunks(createSink(), new Uint8Array(0), 1);

			expect(hashed.toHex()).toBe(oneShotHash(new Uint8Array(0)).toHex());
		});
	},
);

describe.each(CASES)("$name piped from a ReadableStream", (testCase) => {
	const { createSink, oneShotHash } = testCase;

	it("hashes a stream of chunks the same as the one-shot digest", async () => {
		const message = crypto.getRandomValues(new Uint8Array(1000));
		const chunks = [
			message.subarray(0, 100),
			message.subarray(100, 300),
			message.subarray(300),
		];
		const source = new ReadableStream<Uint8Array>({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}

				controller.close();
			},
		});
		const sink = createSink();

		await source.pipeTo(sink);

		expect((await sink.digest).toHex()).toBe(oneShotHash(message).toHex());
	});

	it("rejects digest when the stream aborts", async () => {
		const sink = createSink();
		const writer = sink.getWriter();

		await writer.abort(new Error("boom"));

		await expect(sink.digest).rejects.toThrow("boom");
	});
});
