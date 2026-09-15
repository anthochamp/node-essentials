import { describe, expect, it } from "vitest";

import { AnsiDecoder } from "./ansi-decoder.js";
import { printAnsiToken } from "./ansi-encoder.js";
import { AnsiParseStream } from "./ansi-stream.js";
import type { AnsiToken } from "./ansi-token.js";

const AT_EOF = { atEof: true };
const MID_STREAM = { atEof: false };

function decodeOnce(view: string, context = MID_STREAM) {
	return new AnsiDecoder().decode(view, context);
}

async function tokenize(chunks: readonly string[]): Promise<AnsiToken[]> {
	const stream = new AnsiParseStream();
	const writer = stream.writable.getWriter();
	const reader = stream.readable.getReader();

	const reading = (async () => {
		const out: AnsiToken[] = [];
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				return out;
			}
			out.push(value);
		}
	})();

	const [tokens] = await Promise.all([
		reading,
		(async () => {
			for (const chunk of chunks) {
				await writer.write(new TextEncoder().encode(chunk));
			}
			await writer.close();
		})(),
	]);
	return tokens;
}

describe("AnsiDecoder", () => {
	it("decodes a CSI sequence with its parameters", () => {
		expect(decodeOnce("\u001B[31m")).toStrictEqual({
			status: "decoded",
			value: { kind: "csi", parameters: "31", intermediates: "", final: "m" },
			consumed: 5,
		});
	});

	it("decodes a private-mode CSI sequence", () => {
		expect(decodeOnce("\u001B[?25l")).toStrictEqual({
			status: "decoded",
			value: { kind: "csi", parameters: "?25", intermediates: "", final: "l" },
			consumed: 6,
		});
	});

	it("decodes the 8-bit CSI introducer", () => {
		expect(decodeOnce("\u009B2K")).toStrictEqual({
			status: "decoded",
			value: { kind: "csi", parameters: "2", intermediates: "", final: "K" },
			consumed: 3,
		});
	});

	it("decodes a BEL-terminated OSC sequence", () => {
		expect(decodeOnce("\u001B]8;;https://x\u0007")).toStrictEqual({
			status: "decoded",
			value: { kind: "osc", body: "8;;https://x", terminator: "bel" },
			consumed: 15,
		});
	});

	it("decodes an ST-terminated OSC sequence", () => {
		expect(decodeOnce("\u001B]0;title\u001B\\")).toStrictEqual({
			status: "decoded",
			value: { kind: "osc", body: "0;title", terminator: "st" },
			consumed: 11,
		});
	});

	it("emits text up to the next introducer", () => {
		expect(decodeOnce("hi\u001B[0m")).toStrictEqual({
			status: "decoded",
			value: { kind: "text", text: "hi" },
			consumed: 2,
		});
	});

	it("reports incomplete while a sequence is still arriving", () => {
		expect(decodeOnce("\u001B[3")).toStrictEqual({ status: "incomplete" });
	});

	it("emits an unterminated sequence as text at end of input", () => {
		expect(decodeOnce("\u001B[3", AT_EOF)).toStrictEqual({
			status: "decoded",
			value: { kind: "text", text: "\u001B[3" },
			consumed: 3,
		});
	});
});

describe("printAnsiToken", () => {
	it("round-trips every token kind", () => {
		const source = "a\u001B[31mb\u001B]8;;u\u0007c\u001B]0;t\u001B\\";
		return tokenize([source]).then((tokens) => {
			expect(tokens.map(printAnsiToken).join("")).toBe(source);
		});
	});
});

describe("AnsiParseStream", () => {
	it("reassembles a sequence split across chunks", async () => {
		const tokens = await tokenize(["red:\u001B[", "31m!"]);
		expect(tokens).toStrictEqual([
			{ kind: "text", text: "red:" },
			{ kind: "csi", parameters: "31", intermediates: "", final: "m" },
			{ kind: "text", text: "!" },
		]);
	});

	it("reassembles an OSC sequence split before its terminator", async () => {
		const tokens = await tokenize(["\u001B]8;;https://x", "\u0007go"]);
		expect(tokens).toStrictEqual([
			{ kind: "osc", body: "8;;https://x", terminator: "bel" },
			{ kind: "text", text: "go" },
		]);
	});
});
