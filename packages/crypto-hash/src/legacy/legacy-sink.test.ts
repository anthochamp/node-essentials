import { describe, expect, it } from "vitest";

import { Md5Sink } from "./md5-sink.js";
import { md5 } from "./md5.js";
import { Ripemd160Sink } from "./ripemd160-sink.js";
import { ripemd160 } from "./ripemd160.js";
import { sha1Js } from "./sha1-js.js";
import { Sha1Sink } from "./sha1-sink.js";

type DigestSink = WritableStream<Uint8Array> & {
	readonly digest: Promise<Uint8Array>;
};

/**
 * One test file, parametric over the three legacy hash sinks — see
 * `sha2-sink.test.ts` for the precedent this mirrors.
 */
type LegacySinkCase = {
	readonly name: string;
	readonly createSink: () => DigestSink;
	readonly oneShotHash: (data: Uint8Array) => Uint8Array;
	readonly chunkSizes: readonly number[];
	readonly boundaryMessageLength: number;
};

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

const CASES: readonly LegacySinkCase[] = [
	{
		name: "Md5Sink",
		createSink: () => new Md5Sink(),
		oneShotHash: md5,
		chunkSizes: [1, 3, 7, 55, 56, 63, 64, 65, 200],
		boundaryMessageLength: 1000,
	},
	{
		name: "Sha1Sink",
		createSink: () => new Sha1Sink(),
		oneShotHash: sha1Js,
		chunkSizes: [1, 3, 7, 55, 56, 63, 64, 65, 200],
		boundaryMessageLength: 1000,
	},
	{
		name: "Ripemd160Sink",
		createSink: () => new Ripemd160Sink(),
		oneShotHash: ripemd160,
		chunkSizes: [1, 3, 7, 55, 56, 63, 64, 65, 200],
		boundaryMessageLength: 1000,
	},
];

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
