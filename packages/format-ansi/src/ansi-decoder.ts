import { BEL_CHAR, ESC_CHAR } from "@ac-kit/core";
import type { DecodeContext, Decoder, DecodeResult } from "@ac-kit/format-core";

import { AnsiToken } from "./ansi-token.js";

/** 8-bit CSI introducer, equivalent to the two-character `ESC [`. */
const CSI_8BIT_ = "\u009B";

function isParameterByte(char: string): boolean {
	const code = char.charCodeAt(0);
	return code >= 0x30 && code <= 0x3f;
}

function isIntermediateByte(char: string): boolean {
	const code = char.charCodeAt(0);
	return code >= 0x20 && code <= 0x2f;
}

function isFinalByte(char: string): boolean {
	const code = char.charCodeAt(0);
	return code >= 0x40 && code <= 0x7e;
}

/**
 * Decodes an ANSI/VT100 character stream into text runs and escape sequences.
 *
 * The single implementation of the ANSI read grammar: `stripAnsiEscapes` and
 * `AnsiParseStream` are both driven by this rather than repeating it.
 *
 * Covers CSI (`ESC [` and the 8-bit `\u009B`) and OSC (`ESC ]`, terminated by
 * BEL or ST) — what this package's own builders emit. An escape sequence still
 * arriving is reported as `incomplete`, so a sequence split across chunks is
 * reassembled rather than mistaken for text; an unterminated one at end of
 * input is emitted as text, which is the only lossless option left.
 *
 * Written against `string` rather than `Uint8Array` because a text run must not
 * be split mid-character; byte-to-text conversion is the buffer's job
 * (`TextDecodeBuffer`).
 */
export class AnsiDecoder implements Decoder<AnsiToken, string> {
	decode(view: string, context: DecodeContext): DecodeResult<AnsiToken> {
		const first = view[0]!;

		if (first === ESC_CHAR || first === CSI_8BIT_) {
			const introducerLength = first === CSI_8BIT_ ? 1 : 2;
			const second = first === CSI_8BIT_ ? "[" : view[1];

			if (second === undefined) {
				return this.pendingOrText(view, context);
			}
			if (second === "[") {
				return this.decodeCsi(view, introducerLength, context);
			}
			if (second === "]") {
				return this.decodeOsc(view, context);
			}
			// Not a sequence this package emits: hand the introducer back as text
			// so the stream stays lossless rather than swallowing it.
			return {
				status: "decoded",
				value: { kind: "text", text: first },
				consumed: 1,
			};
		}

		const next = this.nextIntroducer(view, 1);
		const text = view.slice(0, next);
		return { status: "decoded", value: { kind: "text", text }, consumed: next };
	}

	private decodeCsi(
		view: string,
		start: number,
		context: DecodeContext,
	): DecodeResult<AnsiToken> {
		let index = start;
		while (index < view.length && isParameterByte(view[index]!)) {
			index += 1;
		}
		const parameters = view.slice(start, index);

		const intermediateStart = index;
		while (index < view.length && isIntermediateByte(view[index]!)) {
			index += 1;
		}
		const intermediates = view.slice(intermediateStart, index);

		if (index >= view.length) {
			return this.pendingOrText(view, context);
		}
		const final = view[index]!;
		if (!isFinalByte(final)) {
			// A byte outside every CSI class: the sequence is malformed, so the
			// introducer becomes text and scanning resumes after it.
			return {
				status: "decoded",
				value: { kind: "text", text: view.slice(0, start) },
				consumed: start,
			};
		}

		return {
			status: "decoded",
			value: { kind: "csi", parameters, intermediates, final },
			consumed: index + 1,
		};
	}

	private decodeOsc(
		view: string,
		context: DecodeContext,
	): DecodeResult<AnsiToken> {
		const bodyStart = 2;
		for (let index = bodyStart; index < view.length; index++) {
			const char = view[index]!;
			if (char === BEL_CHAR) {
				return {
					status: "decoded",
					value: {
						kind: "osc",
						body: view.slice(bodyStart, index),
						terminator: "bel",
					},
					consumed: index + 1,
				};
			}
			if (char === ESC_CHAR) {
				if (index + 1 >= view.length) {
					return this.pendingOrText(view, context);
				}
				if (view[index + 1] === "\\") {
					return {
						status: "decoded",
						value: {
							kind: "osc",
							body: view.slice(bodyStart, index),
							terminator: "st",
						},
						consumed: index + 2,
					};
				}
				// A bare ESC inside the body ends nothing; treat the introducer as
				// text and rescan from there.
				return {
					status: "decoded",
					value: { kind: "text", text: view.slice(0, bodyStart) },
					consumed: bodyStart,
				};
			}
		}
		return this.pendingOrText(view, context);
	}

	/** Index of the next escape introducer at or after `from`, else the end. */
	private nextIntroducer(view: string, from: number): number {
		for (let index = from; index < view.length; index++) {
			const char = view[index]!;
			if (char === ESC_CHAR || char === CSI_8BIT_) {
				return index;
			}
		}
		return view.length;
	}

	private pendingOrText(
		view: string,
		context: DecodeContext,
	): DecodeResult<AnsiToken> {
		if (context.atEof) {
			return {
				status: "decoded",
				value: { kind: "text", text: view },
				consumed: view.length,
			};
		}
		return { status: "incomplete" };
	}
}
