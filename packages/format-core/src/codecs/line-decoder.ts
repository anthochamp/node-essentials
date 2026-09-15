import { CR, LF, decodeText, type TextEncodingName } from "@ac-kit/core";

import { DECODE_INCOMPLETE, type DecodeResult } from "../decode-result.js";
import type { Decoder } from "../decoder.js";

const DEFAULT_MAX_LINE_LENGTH_ = 65536;

export type LineDecoderOptions = {
	/**
	 * Maximum length, in bytes, of a single line excluding its terminator.
	 *
	 * This is a protocol limit, distinct from a driver's buffer ceiling transport
	 * backstop: exceeding it is a violation the peer should be told about in the
	 * protocol's own vocabulary (SMTP `500`, IRC silently truncating), whereas
	 * exceeding the buffer ceiling is an abuse condition.
	 *
	 * Defaults to 65536. RFC 5321 mandates 1000 for SMTP and RFC 2812 mandates
	 * 512 for IRC, so protocol clients should set this explicitly.
	 */
	maxLineLength?: number;

	/**
	 * Whether an over-length line is fatal.
	 *
	 * Defaults to `false`: the offending bytes are consumed and decoding
	 * continues, since a line protocol resynchronises at the next line
	 * terminator.
	 */
	fatalOnOverflow?: boolean;
};

/**
 * Decodes one string per `\n`-terminated line, stripping a preceding `\r`.
 *
 * This is the read half of the framing used by SMTP, LMTP, IMAP, POP3, IRC and
 * most other text command protocols. Stateful across partial lines, so an
 * instance must back exactly one driver.
 */
export class LineDecoder implements Decoder<string> {
	private readonly maxLineLength: number;
	private readonly fatalOnOverflow: boolean;

	/** Bytes of the current partial line already searched for a terminator. */
	private scanned = 0;

	constructor(
		private readonly encoding: TextEncodingName,
		options?: LineDecoderOptions,
	) {
		this.maxLineLength = options?.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH_;
		this.fatalOnOverflow = options?.fatalOnOverflow ?? false;
	}

	decode(view: Uint8Array): DecodeResult<string> {
		// The driver represents the same prefix plus newly arrived bytes, so
		// rescanning from zero would be quadratic in the length of a long line.
		const from = this.scanned <= view.length ? this.scanned : 0;

		const newlineIndex = view.indexOf(LF, from);

		if (newlineIndex === -1) {
			this.scanned = view.length;
			if (view.length > this.maxLineLength) {
				this.scanned = 0;
				return this.handleOverflow(
					new Error(
						`Line exceeds ${this.maxLineLength} bytes without a terminator`,
					),
					view.length,
				);
			}

			return DECODE_INCOMPLETE;
		}

		this.scanned = 0;

		if (newlineIndex > this.maxLineLength) {
			return this.handleOverflow(
				new Error(
					`Line of ${newlineIndex} bytes exceeds the ${this.maxLineLength} byte limit`,
				),
				newlineIndex + 1,
			);
		}

		const end =
			newlineIndex > 0 && view[newlineIndex - 1] === CR
				? newlineIndex - 1
				: newlineIndex;

		// decodeText copies, so the returned value does not alias the arena.
		const line = decodeText(view.subarray(0, end), this.encoding);

		return { status: "decoded", value: line, consumed: newlineIndex + 1 };
	}

	reset(): void {
		this.scanned = 0;
	}

	private handleOverflow(
		error: unknown,
		consumed: number,
	): DecodeResult<string> {
		return this.fatalOnOverflow
			? { status: "fatal", error }
			: { status: "error", error, consumed };
	}
}
