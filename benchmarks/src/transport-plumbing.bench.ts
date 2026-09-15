import { Duplex, PassThrough } from "node:stream";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { ByteAccumulator, chunkBytes, concatBytes } from "@ac-kit/core";
import type { Codec } from "@ac-kit/format-core";
import { createNetstringCodec } from "@ac-kit/format-netstring";

import {
	NETSTRING_FRAMES,
	NETSTRING_PAYLOAD,
	decodeContext,
	netstringTraffic,
} from "./format-netstring/__fixtures__/fixtures.js";

const CHUNKS = netstringTraffic(NETSTRING_FRAMES, NETSTRING_PAYLOAD);
const MAX_BUFFER = 8 * 1024 * 1024;

/**
 * Same bytes as {@link CHUNKS}, split small so the per-chunk plumbing cost
 * dominates instead of the decode cost.
 */
const SMALL_CHUNKS = chunkBytes(concatBytes(CHUNKS), 64);
const SMALL_CHUNK_BYTES = SMALL_CHUNKS.reduce(
	(total, chunk) => total + chunk.length,
	0,
);

/** Fragment counts an SMTP `DATA` body or a length-prefixed frame really emits. */
const WRITE_FRAGMENTS = [2, 4, 16] as const;
const WRITE_FRAGMENT_SIZE = 1400;
const WRITE_ITERATIONS = 2_000;

function expectDecoded(count: number): void {
	if (count !== NETSTRING_FRAMES) {
		throw new Error(`expected ${NETSTRING_FRAMES} frames, got ${count}`);
	}
}

function expectBytes(total: number): void {
	if (total !== SMALL_CHUNK_BYTES) {
		throw new Error(`expected ${SMALL_CHUNK_BYTES} bytes, got ${total}`);
	}
}

/** Near-zero-cost sink, so a case measures chunk delivery and nothing else. */
function makeCountingSink(): {
	push: (chunk: Uint8Array) => void;
	total: () => number;
} {
	let total = 0;
	return {
		push(chunk) {
			total += chunk.length;
		},
		total: () => total,
	};
}

/**
 * The identical decode work every plumbing variant drives, so the only
 * difference between cases is how a chunk reaches this function.
 */
function makeSink(): {
	push: (chunk: Uint8Array) => void;
	count: () => number;
} {
	const codec: Codec<Uint8Array, Uint8Array | string> = createNetstringCodec();
	const accumulator = new ByteAccumulator(MAX_BUFFER);
	let count = 0;
	return {
		push(chunk) {
			accumulator.append(chunk);
			while (accumulator.buffered > 0) {
				const result = codec.decode(accumulator.view(), decodeContext);
				if (result.status !== "decoded") {
					break;
				}
				accumulator.consume(result.consumed);
				count++;
			}
		},
		count: () => count,
	};
}

durationCondition(
	`Transport receive plumbing only — ${SMALL_CHUNKS.length} chunks, counting sink`,
	() => {
		durationCase(
			"push callback (today's Transport)",
			{ tags: { kind: "js" } },
			() => {
				const sink = makeCountingSink();
				const handler = (chunk: Uint8Array) => sink.push(chunk);
				for (const chunk of SMALL_CHUNKS) {
					handler(chunk);
				}
				expectBytes(sink.total());
			},
		);

		durationCase(
			"ReadableStream + reader.read() loop",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeCountingSink();
				let index = 0;
				const stream = new ReadableStream<Uint8Array>({
					pull(controller) {
						if (index < SMALL_CHUNKS.length) {
							controller.enqueue(SMALL_CHUNKS[index++]!);
						} else {
							controller.close();
						}
					},
				});
				const reader = stream.getReader();
				for (;;) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					sink.push(value);
				}
				expectBytes(sink.total());
			},
		);

		durationCase(
			"ReadableStream.pipeTo(WritableStream)",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeCountingSink();
				let index = 0;
				const stream = new ReadableStream<Uint8Array>({
					pull(controller) {
						if (index < SMALL_CHUNKS.length) {
							controller.enqueue(SMALL_CHUNKS[index++]!);
						} else {
							controller.close();
						}
					},
				});
				await stream.pipeTo(
					new WritableStream<Uint8Array>({
						write(chunk) {
							sink.push(chunk);
						},
					}),
				);
				expectBytes(sink.total());
			},
		);
	},
);

durationCondition(
	"Transport receive plumbing — same bytes, same codec, no Node stream",
	() => {
		durationCase(
			"push callback (today's Transport)",
			{ tags: { kind: "js" } },
			() => {
				const sink = makeSink();
				// Exactly what DuplexTransport.start does: a direct call per chunk.
				const handler = (chunk: Uint8Array) => sink.push(chunk);
				for (const chunk of CHUNKS) {
					handler(chunk);
				}
				expectDecoded(sink.count());
			},
		);

		durationCase(
			"ReadableStream + reader.read() loop",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeSink();
				let index = 0;
				const stream = new ReadableStream<Uint8Array>({
					pull(controller) {
						if (index < CHUNKS.length) {
							controller.enqueue(CHUNKS[index++]!);
						} else {
							controller.close();
						}
					},
				});
				const reader = stream.getReader();
				for (;;) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					sink.push(value);
				}
				expectDecoded(sink.count());
			},
		);

		durationCase(
			"ReadableStream.pipeTo(WritableStream)",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeSink();
				let index = 0;
				const stream = new ReadableStream<Uint8Array>({
					pull(controller) {
						if (index < CHUNKS.length) {
							controller.enqueue(CHUNKS[index++]!);
						} else {
							controller.close();
						}
					},
				});
				await stream.pipeTo(
					new WritableStream<Uint8Array>({
						write(chunk) {
							sink.push(chunk);
						},
					}),
				);
				expectDecoded(sink.count());
			},
		);
	},
);

durationCondition(
	"Transport receive plumbing — over a real Node duplex (PassThrough)",
	() => {
		durationCase(
			"on('data') (today's DuplexTransport)",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeSink();
				const source = new PassThrough();
				source.on("data", (chunk: Buffer) => sink.push(chunk));
				for (const chunk of CHUNKS) {
					source.write(chunk);
				}
				source.end();
				await new Promise((resolve) => setImmediate(resolve));
				expectDecoded(sink.count());
			},
		);

		durationCase(
			"Duplex.toWeb() + reader.read() loop",
			{ tags: { kind: "js" } },
			async () => {
				const sink = makeSink();
				const source = new PassThrough();
				const { readable } = Duplex.toWeb(source);
				for (const chunk of CHUNKS) {
					source.write(chunk);
				}
				source.end();
				const reader = (readable as ReadableStream<Uint8Array>).getReader();
				for (;;) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					sink.push(value);
				}
				expectDecoded(sink.count());
			},
		);
	},
);

durationCondition(
	"Transport write path — vectored vs. concatenate-then-write",
	() => {
		for (const fragmentCount of WRITE_FRAGMENTS) {
			const fragments: Uint8Array[] = Array.from(
				{ length: fragmentCount },
				(_, index) => new Uint8Array(WRITE_FRAGMENT_SIZE).fill(0x61 + index),
			);

			durationCase(
				`${fragmentCount} fragments — cork + N writes (today)`,
				{ tags: { kind: "js" } },
				async () => {
					const sink = new PassThrough();
					sink.resume();
					for (let i = 0; i < WRITE_ITERATIONS; i++) {
						sink.cork();
						for (const fragment of fragments) {
							sink.write(fragment);
						}
						sink.uncork();
					}
					sink.end();
				},
			);

			durationCase(
				`${fragmentCount} fragments — concatBytes + 1 write (Web Streams)`,
				{ tags: { kind: "js" } },
				async () => {
					const sink = new PassThrough();
					sink.resume();
					for (let i = 0; i < WRITE_ITERATIONS; i++) {
						sink.write(concatBytes(fragments));
					}
					sink.end();
				},
			);
			durationCase(
				`${fragmentCount} fragments — N uncorked writes (Web Streams)`,
				{ tags: { kind: "js" } },
				() => {
					const sink = new PassThrough();
					sink.resume();
					for (let i = 0; i < WRITE_ITERATIONS; i++) {
						for (const fragment of fragments) {
							sink.write(fragment);
						}
					}
					sink.end();
				},
			);
		}
	},
);
