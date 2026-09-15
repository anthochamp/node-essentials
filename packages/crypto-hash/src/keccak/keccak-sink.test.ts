import {
	type CavpDigestCase,
	parseCavpDigestRsp,
	parseCavpXofRsp,
	readVectorFile,
} from "@ac-kit/fixture-crypto";
import { describe, expect, it } from "vitest";

import { Sha3_224Sink } from "./sha3-224-sink.js";
import { sha3_224 } from "./sha3-224.js";
import { Sha3_256Sink } from "./sha3-256-sink.js";
import { sha3_256 } from "./sha3-256.js";
import { Sha3_384Sink } from "./sha3-384-sink.js";
import { sha3_384 } from "./sha3-384.js";
import { Sha3_512Sink } from "./sha3-512-sink.js";
import { sha3_512 } from "./sha3-512.js";
import { Shake128Sink } from "./shake128-sink.js";
import { shake128 } from "./shake128.js";
import { Shake256Sink } from "./shake256-sink.js";
import { shake256 } from "./shake256.js";

type DigestSink = WritableStream<Uint8Array> & {
	readonly digest: Promise<Uint8Array>;
};

/**
 * One test file, parametric over every SHA-3/SHAKE sink, instead of one
 * near-identical file per algorithm — each sink differs only in which
 * `KeccakSink` preset it configures, its rate, and (for SHAKE) an output length
 * chosen per instance rather than fixed by the algorithm.
 */
type Sha3SinkCase = {
	readonly name: string;
	readonly fileNamePrefix: string;
	readonly createSink: () => DigestSink;
	readonly oneShotHash: (data: Uint8Array) => Uint8Array;
	readonly chunkSizes: readonly number[];
	readonly boundaryMessageLength: number;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
};

async function loadSha3SinkCase(
	config: Omit<Sha3SinkCase, "shortMsgCases" | "longMsgCases">,
): Promise<Sha3SinkCase> {
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

/**
 * Writes `message` to `sink` split into `chunkSize`-byte pieces, to exercise
 * the tail-buffering logic across an arbitrary number of `write()` calls rather
 * than always landing on a rate boundary.
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

const SHA3_SINK_CASES: readonly Sha3SinkCase[] = await Promise.all([
	loadSha3SinkCase({
		name: "Sha3_224Sink",
		fileNamePrefix: "SHA3_224",
		createSink: () => new Sha3_224Sink(),
		oneShotHash: sha3_224,
		chunkSizes: [1, 3, 7, 143, 144, 145, 287, 400],
		boundaryMessageLength: 600,
	}),
	loadSha3SinkCase({
		name: "Sha3_256Sink",
		fileNamePrefix: "SHA3_256",
		createSink: () => new Sha3_256Sink(),
		oneShotHash: sha3_256,
		chunkSizes: [1, 3, 7, 135, 136, 137, 271, 400],
		boundaryMessageLength: 600,
	}),
	loadSha3SinkCase({
		name: "Sha3_384Sink",
		fileNamePrefix: "SHA3_384",
		createSink: () => new Sha3_384Sink(),
		oneShotHash: sha3_384,
		chunkSizes: [1, 3, 7, 103, 104, 105, 207, 400],
		boundaryMessageLength: 600,
	}),
	loadSha3SinkCase({
		name: "Sha3_512Sink",
		fileNamePrefix: "SHA3_512",
		createSink: () => new Sha3_512Sink(),
		oneShotHash: sha3_512,
		chunkSizes: [1, 3, 7, 71, 72, 73, 143, 400],
		boundaryMessageLength: 600,
	}),
]);

describe.each(SHA3_SINK_CASES)(
	"$name against NIST CAVP SHA-3 vectors, one write per message",
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

describe.each(SHA3_SINK_CASES)(
	"$name, chunk boundaries independent of rate size",
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

describe.each(SHA3_SINK_CASES)(
	"$name piped from a ReadableStream",
	(testCase) => {
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
	},
);

type ShakeSinkCase = {
	readonly name: string;
	readonly fileNamePrefix: string;
	readonly createSink: (outputBytes: number) => DigestSink;
	readonly oneShotHash: (data: Uint8Array, outputBytes: number) => Uint8Array;
	readonly chunkSizes: readonly number[];
	readonly boundaryMessageLength: number;
	readonly shortMsgCases: readonly CavpDigestCase[];
	readonly longMsgCases: readonly CavpDigestCase[];
};

async function loadShakeSinkCase(
	config: Omit<ShakeSinkCase, "shortMsgCases" | "longMsgCases">,
): Promise<ShakeSinkCase> {
	const [shortMsgCases, longMsgCases] = await Promise.all([
		readVectorFile(
			"cavp-shake-byte-test-vectors",
			`${config.fileNamePrefix}ShortMsg.rsp`,
		).then(parseCavpXofRsp),
		readVectorFile(
			"cavp-shake-byte-test-vectors",
			`${config.fileNamePrefix}LongMsg.rsp`,
		).then(parseCavpXofRsp),
	]);

	return { ...config, shortMsgCases, longMsgCases };
}

const SHAKE_SINK_CASES: readonly ShakeSinkCase[] = await Promise.all([
	loadShakeSinkCase({
		name: "Shake128Sink",
		fileNamePrefix: "SHAKE128",
		createSink: (outputBytes) => new Shake128Sink(outputBytes),
		oneShotHash: shake128,
		chunkSizes: [1, 3, 7, 167, 168, 169, 335, 400],
		boundaryMessageLength: 600,
	}),
	loadShakeSinkCase({
		name: "Shake256Sink",
		fileNamePrefix: "SHAKE256",
		createSink: (outputBytes) => new Shake256Sink(outputBytes),
		oneShotHash: shake256,
		chunkSizes: [1, 3, 7, 135, 136, 137, 271, 400],
		boundaryMessageLength: 600,
	}),
]);

describe.each(SHAKE_SINK_CASES)(
	"$name against NIST CAVP SHAKE vectors, one write per message",
	(testCase) => {
		const { createSink, shortMsgCases, longMsgCases } = testCase;

		it.each(shortMsgCases)(
			"ShortMsg Len=$lengthBits",
			async ({ message, digest }) => {
				const hashed = await hashInChunks(
					createSink(digest.length),
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
					createSink(digest.length),
					message,
					message.length || 1,
				);

				expect(hashed.toHex()).toBe(digest.toHex());
			},
		);
	},
);

describe.each(SHAKE_SINK_CASES)(
	"$name, chunk boundaries independent of rate size",
	(testCase) => {
		const { createSink, oneShotHash, chunkSizes, boundaryMessageLength } =
			testCase;

		it.each(chunkSizes)(
			"matches the one-shot digest split into %i-byte writes",
			async (chunkSize) => {
				const message = crypto.getRandomValues(
					new Uint8Array(boundaryMessageLength),
				);
				const hashed = await hashInChunks(createSink(32), message, chunkSize);

				expect(hashed.toHex()).toBe(oneShotHash(message, 32).toHex());
			},
		);

		it("matches the one-shot digest for an empty message", async () => {
			const hashed = await hashInChunks(createSink(32), new Uint8Array(0), 1);

			expect(hashed.toHex()).toBe(oneShotHash(new Uint8Array(0), 32).toHex());
		});

		it("matches the one-shot digest for an output longer than the rate", async () => {
			const message = crypto.getRandomValues(
				new Uint8Array(boundaryMessageLength),
			);
			const hashed = await hashInChunks(createSink(500), message, 200);

			expect(hashed.toHex()).toBe(oneShotHash(message, 500).toHex());
		});
	},
);

describe.each(SHAKE_SINK_CASES)(
	"$name piped from a ReadableStream",
	(testCase) => {
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
			const sink = createSink(32);

			await source.pipeTo(sink);

			expect((await sink.digest).toHex()).toBe(
				oneShotHash(message, 32).toHex(),
			);
		});

		it("rejects digest when the stream aborts", async () => {
			const sink = createSink(32);
			const writer = sink.getWriter();

			await writer.abort(new Error("boom"));

			await expect(sink.digest).rejects.toThrow("boom");
		});
	},
);

describe.each(SHAKE_SINK_CASES)("$name construction", (testCase) => {
	const { createSink } = testCase;

	it.each([-1, 1.5, Number.NaN])(
		"throws a RangeError for outputBytes=%p",
		(outputBytes) => {
			expect(() => createSink(outputBytes)).toThrow(RangeError);
		},
	);
});
