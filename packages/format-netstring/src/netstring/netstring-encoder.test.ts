import { decodeText, encodeTextUtf8 } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import {
	createNetstringEncoder,
	encodeNetstring,
	NetstringEncodeStream,
} from "./netstring-encoder.js";

async function encodeAll(
	chunks: readonly (Uint8Array | string)[],
): Promise<Uint8Array[]> {
	const encoder = new NetstringEncodeStream();

	// The default queuing strategy has a high-water mark of 1, so a write()
	// whose transform() enqueues a frame will not resolve until that frame is
	// read. Drain the readable side concurrently with writing, rather than
	// after closing, to avoid deadlocking against that backpressure.
	const output: Uint8Array[] = [];
	const draining = (async () => {
		for await (const frame of encoder.readable) {
			output.push(frame);
		}
	})();

	const writer = encoder.writable.getWriter();
	for (const chunk of chunks) {
		await writer.write(chunk);
	}
	await writer.close();
	await draining;

	return output;
}

function text(bytes: Uint8Array): string {
	return decodeText(bytes, "utf-8");
}

suite("createNetstringEncoder", () => {
	test("returns the frame vectored, without copying the payload", () => {
		const payload = encodeTextUtf8("hello");
		const parts = createNetstringEncoder().encode(
			payload,
		) as readonly Uint8Array[];

		expect(parts).toHaveLength(3);
		expect(parts[1]).toBe(payload);
		expect(parts.map(text).join("")).toBe("5:hello,");
	});
});

suite("encodeNetstring", () => {
	test("concatenates the vectored frame into one buffer", () => {
		expect(text(encodeNetstring(encodeTextUtf8("hello")))).toBe("5:hello,");
	});

	test("encodes a string payload as UTF-8", () => {
		expect(text(encodeNetstring("hi"))).toBe("2:hi,");
	});

	test("encodes an empty payload", () => {
		expect(text(encodeNetstring(new Uint8Array(0)))).toBe("0:,");
	});
});

suite("NetstringEncodeStream", () => {
	test("encodes a Uint8Array payload as a netstring frame", async () => {
		const output = await encodeAll([encodeTextUtf8("hello")]);
		expect(output.map(text).join("")).toBe("5:hello,");
	});

	test("encodes a string payload as UTF-8", async () => {
		const output = await encodeAll(["hi"]);
		expect(output.map(text).join("")).toBe("2:hi,");
	});

	test("encodes an empty payload", async () => {
		const output = await encodeAll([new Uint8Array(0)]);
		expect(output.map(text).join("")).toBe("0:,");
	});

	test("encodes multiple payloads in sequence", async () => {
		const output = await encodeAll([
			encodeTextUtf8("foo"),
			encodeTextUtf8("bar"),
		]);
		expect(output.map(text).join("")).toBe("3:foo,3:bar,");
	});
});
