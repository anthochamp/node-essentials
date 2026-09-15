import { describe, expect, it } from "vitest";

import { Blake2bSink } from "./blake2b-sink.js";
import { blake2b } from "./blake2b.js";
import { Blake2sSink } from "./blake2s-sink.js";
import { blake2s } from "./blake2s.js";

type DigestSink = WritableStream<Uint8Array> & {
	readonly digest: Promise<Uint8Array>;
};

/**
 * One test file, parametric over both BLAKE2 sinks — see `sha2-sink.test.ts`
 * for the precedent this mirrors.
 */
type Blake2SinkCase = {
	readonly name: string;
	readonly createSink: () => DigestSink;
	readonly oneShotHash: (data: Uint8Array) => Uint8Array;
	readonly blockSizeBytes: number;
	readonly chunkSizes: readonly number[];
	readonly boundaryMessageLength: number;
};

/**
 * Writes `message` to `sink` split into `chunkSize`-byte pieces, to exercise
 * `BlockAccumulator`'s `holdBackFinalBlock` "hold back the last full block"
 * logic across an arbitrary number of `write()` calls, not just whichever split
 * its own `absorb()` happens to receive from a single call.
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

const CASES: readonly Blake2SinkCase[] = [
	{
		name: "Blake2bSink",
		createSink: () => new Blake2bSink(),
		oneShotHash: blake2b,
		blockSizeBytes: 128,
		chunkSizes: [1, 3, 7, 127, 128, 129, 255, 400],
		boundaryMessageLength: 1000,
	},
	{
		name: "Blake2sSink",
		createSink: () => new Blake2sSink(),
		oneShotHash: blake2s,
		blockSizeBytes: 64,
		chunkSizes: [1, 3, 7, 63, 64, 65, 127, 200],
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

		it("matches the one-shot digest for a message exactly one block long", async () => {
			const message = crypto.getRandomValues(
				new Uint8Array(testCase.blockSizeBytes),
			);
			const hashed = await hashInChunks(
				createSink(),
				message,
				testCase.blockSizeBytes,
			);

			expect(hashed.toHex()).toBe(oneShotHash(message).toHex());
		});

		it("matches the one-shot digest for a message exactly two blocks long", async () => {
			const message = crypto.getRandomValues(
				new Uint8Array(testCase.blockSizeBytes * 2),
			);
			const hashed = await hashInChunks(
				createSink(),
				message,
				testCase.blockSizeBytes,
			);

			expect(hashed.toHex()).toBe(oneShotHash(message).toHex());
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
