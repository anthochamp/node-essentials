import { Duplex } from "node:stream";

import { BufferOverflowError } from "@ac-kit/core";
import type { Codec, DecodeResult } from "@ac-kit/format-core";
import { DECODE_INCOMPLETE, createLineCodec } from "@ac-kit/format-core";
import { createNetstringCodec } from "@ac-kit/format-netstring";
import { FrameLink } from "@ac-kit/net-core";
import { expect, suite, test, vi } from "vitest";

import { DuplexTransport } from "./duplex-transport.js";
import { frameLinkFromDuplex } from "./frame-link-from-duplex.js";

class FakeDuplex extends Duplex {
	readonly written: Buffer[] = [];

	override _read(): void {}

	override _write(
		chunk: Buffer,
		_encoding: BufferEncoding,
		callback: () => void,
	): void {
		this.written.push(Buffer.from(chunk));
		callback();
	}
}

/** Node delivers pushed data on a later tick, so tests must yield first. */
function flush(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve));
}

/** Calls the write callback synchronously, which is legal for a custom Duplex. */
class SyncWriteDuplex extends Duplex {
	override _read(): void {}

	override _write(
		_chunk: Buffer,
		_encoding: BufferEncoding,
		callback: () => void,
	): void {
		callback();
	}
}

function makeLineLink(options?: { maxBufferSize?: number }) {
	const duplex = new FakeDuplex();
	const frames: string[] = [];
	const link = frameLinkFromDuplex<string>(duplex, {
		codec: createLineCodec("utf-8"),
		sink: (value) => frames.push(value),
		maxBufferSize: options?.maxBufferSize ?? 1024 * 1024,
	});
	return { duplex, link, frames };
}

suite("FrameLink", () => {
	suite("decoding", () => {
		test("emits one value per delimited line", async () => {
			const { duplex, frames } = makeLineLink();
			duplex.push(Buffer.from("one\r\ntwo\r\n"));
			await flush();
			expect(frames).toStrictEqual(["one", "two"]);
		});

		test("reassembles a value split across chunks", async () => {
			const { duplex, frames } = makeLineLink();
			duplex.push(Buffer.from("par"));
			duplex.push(Buffer.from("ti"));
			duplex.push(Buffer.from("al\r\n"));
			await flush();
			expect(frames).toStrictEqual(["partial"]);
		});

		test("honours needAtLeast instead of re-decoding on every chunk", async () => {
			const duplex = new FakeDuplex();
			const decode = vi.fn((view: Buffer): DecodeResult<Buffer> =>
				view.length < 64
					? { status: "incomplete", needAtLeast: 64 }
					: { status: "decoded", value: Buffer.from(view), consumed: 64 },
			);
			frameLinkFromDuplex<Buffer>(duplex, {
				codec: { decode, encode: (value) => value } as Codec<Buffer, Buffer>,
				sink: () => {},
				maxBufferSize: 4096,
			});

			for (let i = 0; i < 8; i++) {
				duplex.push(Buffer.alloc(8));
			}
			await flush();

			// One call for the first chunk, then suppressed until the hint is met.
			expect(decode).toHaveBeenCalledTimes(2);
		});
	});

	suite("resource limits", () => {
		test("fails fatally when the receive ceiling is exceeded", async () => {
			const duplex = new FakeDuplex();
			const errors: unknown[] = [];
			const link = frameLinkFromDuplex<string>(duplex, {
				codec: createLineCodec("utf-8"),
				sink: () => {},
				maxBufferSize: 32,
			});
			link.subscribe("error", (error) => errors.push(error));

			duplex.push(Buffer.alloc(64, 0x41));
			await flush();

			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(BufferOverflowError);
		});

		test("rejects an absurd declared netstring length before allocating", async () => {
			const duplex = new FakeDuplex();
			const errors: unknown[] = [];
			const link = frameLinkFromDuplex<Uint8Array>(duplex, {
				codec: createNetstringCodec({ maxPayloadLength: 1024 }),
				sink: () => {},
				maxBufferSize: 1024 * 1024,
			});
			link.subscribe("error", (error) => errors.push(error));

			duplex.push(Buffer.from("999999999999:"));
			await flush();

			expect(errors).toHaveLength(1);
			expect(link.buffered).toBeLessThan(64);
		});
	});

	suite("error recovery", () => {
		test("a recoverable violation does not stop later values", async () => {
			const duplex = new FakeDuplex();
			const frames: Uint8Array[] = [];
			const soft: unknown[] = [];
			const fatal: unknown[] = [];
			const link = frameLinkFromDuplex<Uint8Array>(duplex, {
				codec: createNetstringCodec(),
				sink: (value) => frames.push(value),
				maxBufferSize: 4096,
			});
			link.subscribe("protocolError", (error) => soft.push(error));
			link.subscribe("error", (error) => fatal.push(error));

			duplex.push(Buffer.from("x5:hello,3:abc,"));
			await flush();

			expect(soft).toHaveLength(1);
			expect(fatal).toHaveLength(0);
			expect(
				frames.map((value) => new TextDecoder().decode(value)),
			).toStrictEqual(["hello", "abc"]);
		});
	});

	suite("re-entrancy", () => {
		test("reset from inside a sink handler stops the decode loop", async () => {
			const duplex = new FakeDuplex();
			const frames: string[] = [];
			let link: FrameLink<string>;
			link = frameLinkFromDuplex<string>(duplex, {
				codec: createLineCodec("utf-8"),
				sink: (value) => {
					frames.push(value);
					link.reset();
				},
				maxBufferSize: 4096,
			});

			duplex.push(Buffer.from("a\r\nb\r\nc\r\n"));
			await flush();

			expect(frames).toStrictEqual(["a"]);
			expect(link.buffered).toBe(0);
		});
	});

	suite("protocol switching", () => {
		test("takeResidue hands undecoded bytes to the next protocol", async () => {
			const { duplex, link, frames } = makeLineLink();
			duplex.push(Buffer.from("HTTP/1.1 101\r\n"));
			duplex.push(Buffer.from("\x81\x05hello"));
			await flush();

			const residue = link.takeResidue();

			expect(frames).toStrictEqual(["HTTP/1.1 101"]);
			expect(residue).toStrictEqual(new TextEncoder().encode("\x81\x05hello"));
			expect(link.buffered).toBe(0);
		});

		test("swapTransport discards buffered plaintext by default", async () => {
			const { duplex, link, frames } = makeLineLink();
			duplex.push(Buffer.from("220 ready\r\nINJECTED"));
			await flush();
			expect(frames).toStrictEqual(["220 ready"]);
			expect(link.buffered).toBe(8);

			const secured = new FakeDuplex();
			link.swapTransport(new DuplexTransport(secured));

			expect(link.buffered).toBe(0);
			secured.push(Buffer.from(" COMMAND\r\n"));
			await flush();
			expect(frames).toStrictEqual(["220 ready", " COMMAND"]);
		});

		test("swapCodec reinterprets already-buffered bytes on the next chunk", async () => {
			const duplex = new FakeDuplex();
			const frames: string[] = [];
			const link = frameLinkFromDuplex<string>(duplex, {
				codec: createLineCodec("utf-8"),
				sink: (value) => frames.push(value),
				maxBufferSize: 4096,
			});

			duplex.push(Buffer.from("first\r\nleftover"));
			await flush();
			expect(frames).toStrictEqual(["first"]);

			link.swapCodec({
				decode: (view): DecodeResult<string> => ({
					status: "decoded",
					value: `swapped:${new TextDecoder().decode(view)}`,
					consumed: view.length,
				}),
				encode: (value: string) => new TextEncoder().encode(value),
			});

			duplex.push(Buffer.from("!"));
			await flush();

			expect(frames).toStrictEqual(["first", "swapped:leftover!"]);
		});
	});

	suite("body streaming", () => {
		test("streams a declared payload without buffering it", async () => {
			const duplex = new FakeDuplex();
			let body: ReadableStream<Uint8Array> | undefined;

			const codec: Codec<string, string> = {
				decode(view): DecodeResult<string> {
					const newline = view.indexOf(0x0a);
					if (newline === -1) {
						return DECODE_INCOMPLETE;
					}
					const header = new TextDecoder().decode(view.subarray(0, newline));
					const length = Number.parseInt(header, 10);
					return {
						status: "decoded",
						value: header,
						consumed: newline + 1,
						body: { mode: "length", byteLength: length },
					};
				},
				encode: (value) => new TextEncoder().encode(value),
			};

			frameLinkFromDuplex<string>(duplex, {
				codec,
				sink: (_value, stream) => {
					body = stream;
				},
				maxBufferSize: 1024,
			});

			duplex.push(Buffer.from("11\n"));
			duplex.push(Buffer.from("hello "));
			duplex.push(Buffer.from("world"));
			await flush();

			expect(body).toBeDefined();
			const chunks: Buffer[] = [];
			for await (const chunk of body!) {
				chunks.push(chunk as Buffer);
			}
			expect(Buffer.concat(chunks).toString()).toBe("hello world");
		});
	});

	suite("writing", () => {
		test("survives a transport whose write callback is synchronous", async () => {
			const duplex = new SyncWriteDuplex();
			const link = frameLinkFromDuplex<string>(duplex, {
				codec: createLineCodec("utf-8"),
				sink: () => {},
				maxBufferSize: 1024,
			});

			await expect(link.send("PING")).resolves.toBeUndefined();
		});

		test("writes a multi-buffer value as one vectored write", async () => {
			const duplex = new FakeDuplex();
			const link = frameLinkFromDuplex<Buffer>(duplex, {
				codec: {
					decode: () => DECODE_INCOMPLETE,
					encode: (value) => [Buffer.from("HDR"), value],
				} as Codec<Buffer, Buffer>,
				sink: () => {},
				maxBufferSize: 1024,
			});

			await link.send(Buffer.from("PAYLOAD"));

			expect(Buffer.concat(duplex.written).toString()).toBe("HDRPAYLOAD");
		});
	});

	suite("lifecycle", () => {
		test("reports peer half-close as an end event", async () => {
			const { duplex, link } = makeLineLink();
			const ended = vi.fn();
			link.subscribe("end", ended);

			duplex.push(null);
			await flush();

			expect(ended).toHaveBeenCalledTimes(1);
		});
	});
});
