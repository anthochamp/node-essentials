import { decodeText, encodeTextUtf8 } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { NetstringDecodeStream } from "./netstring-decoder.js";
import { NetstringProtocolError } from "./netstring-error.js";

function bytes(text: string): Uint8Array {
	return encodeTextUtf8(text);
}

async function decodeAll(
	chunks: readonly Uint8Array[],
	options: { maxPayloadLength?: number } = {},
): Promise<{
	frames: Uint8Array[];
	errors: unknown[];
	fatal?: unknown;
}> {
	const errors: unknown[] = [];
	const decoder = new NetstringDecodeStream({
		...options,
		onProtocolError: (error) => errors.push(error),
	});

	// The default queuing strategy has a high-water mark of 1, so a write()
	// whose transform() enqueues a frame will not resolve until that frame is
	// read. Drain the readable side concurrently with writing, rather than
	// after closing, to avoid deadlocking against that backpressure.
	//
	// A fatal result errors both sides, so both are settled before reporting:
	// awaiting only one leaves the other rejection unhandled.
	const frames: Uint8Array[] = [];
	const draining = (async () => {
		for await (const frame of decoder.readable) {
			frames.push(frame);
		}
	})();

	const writing = (async () => {
		const writer = decoder.writable.getWriter();
		for (const chunk of chunks) {
			await writer.write(chunk);
		}
		await writer.close();
	})();

	const [drained, written] = await Promise.allSettled([draining, writing]);
	const fatal =
		drained.status === "rejected"
			? drained.reason
			: written.status === "rejected"
				? written.reason
				: undefined;

	return { frames, errors, ...(fatal !== undefined ? { fatal } : {}) };
}

suite("NetstringDecodeStream", () => {
	suite("decoding", () => {
		test("decodes a single netstring into a frame", async () => {
			const { frames } = await decodeAll([bytes("5:hello,")]);
			expect(frames).toHaveLength(1);
			expect(decodeText(frames[0]!, "utf-8")).toBe("hello");
		});

		test("decodes an empty payload", async () => {
			const { frames } = await decodeAll([bytes("0:,")]);
			expect(frames).toHaveLength(1);
			expect(frames[0]).toHaveLength(0);
		});

		test("assembles a frame split across multiple writes", async () => {
			const { frames } = await decodeAll([bytes("5:hel"), bytes("lo,")]);
			expect(frames).toHaveLength(1);
			expect(decodeText(frames[0]!, "utf-8")).toBe("hello");
		});

		test("decodes two consecutive frames from a single write", async () => {
			const { frames } = await decodeAll([bytes("3:foo,3:bar,")]);
			expect(frames).toHaveLength(2);
			expect(decodeText(frames[0]!, "utf-8")).toBe("foo");
			expect(decodeText(frames[1]!, "utf-8")).toBe("bar");
		});
	});

	suite("error recovery", () => {
		test("reports an invalid byte in the length field and continues parsing", async () => {
			const { frames, errors } = await decodeAll([bytes("x5:hello,")]);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(NetstringProtocolError);
			expect(frames).toHaveLength(1);
			expect(decodeText(frames[0]!, "utf-8")).toBe("hello");
		});

		test("treats a missing comma terminator as fatal", async () => {
			// The declared length pointed at a non-terminator, so the length itself
			// cannot be trusted and there is no position to resynchronise from.
			const { fatal, frames } = await decodeAll([bytes("3:fooX5:hello,")]);
			expect(fatal).toBeInstanceOf(NetstringProtocolError);
			expect(frames).toHaveLength(0);
		});

		test("rejects an absurd declared length before buffering any of it", async () => {
			const { fatal } = await decodeAll([bytes("999999999999:")]);
			expect(fatal).toBeInstanceOf(NetstringProtocolError);
			expect((fatal as Error).message).toMatch(/exceeds the \d+ byte limit/);
		});

		test("honours a caller-supplied payload ceiling", async () => {
			const { fatal } = await decodeAll([bytes("99:")], {
				maxPayloadLength: 4,
			});
			expect(fatal).toBeInstanceOf(NetstringProtocolError);
		});

		test("reports an empty length field", async () => {
			// Just the colon with no preceding digits: exactly one error, no stray bytes.
			const { errors } = await decodeAll([bytes(":")]);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(NetstringProtocolError);
		});

		test("keeps decoding after a protocol error, without closing the stream", async () => {
			const { frames } = await decodeAll([bytes("x"), bytes("3:ok!,")]);
			expect(frames).toHaveLength(1);
			expect(decodeText(frames[0]!, "utf-8")).toBe("ok!");
		});
	});
});
