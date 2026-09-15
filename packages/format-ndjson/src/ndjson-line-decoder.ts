import {
	type DecodeContext,
	type Decoder,
	type DecodeResult,
} from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

/**
 * A malformed or over-long NDJSON line. Carries the raw offending line so a
 * caller's recovery policy can report it.
 */
export class NdjsonLineError extends Error {
	constructor(
		message: string,
		readonly line: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "NdjsonLineError";
	}
}

/**
 * Decodes one JSON value per `\n`-terminated line, skipping blank lines.
 *
 * The single implementation of the NDJSON read grammar: `parseNdjson` and
 * `NdjsonParseStream` are both driven by this rather than repeating it.
 *
 * Written against `string` rather than `Uint8Array` because the grammar is
 * defined over characters; byte-to-text conversion is the buffer's job
 * (`TextDecodeBuffer`).
 */
export class NdjsonLineDecoder implements Decoder<JsonValue, string> {
	constructor(private readonly maxLineLength: number) {}

	decode(view: string, context: DecodeContext): DecodeResult<JsonValue> {
		const newline = view.indexOf("\n");
		if (newline === -1) {
			if (context.atEof && view.length > 0) {
				return this.parseLine(view, view.length);
			}
			return { status: "incomplete" };
		}
		return this.parseLine(view.slice(0, newline), newline + 1);
	}

	private parseLine(raw: string, consumed: number): DecodeResult<JsonValue> {
		const trimmed = raw.trimEnd();
		if (trimmed.length === 0) {
			return { status: "skip", consumed };
		}
		if (trimmed.length > this.maxLineLength) {
			return {
				status: "error",
				error: new NdjsonLineError(
					`NDJSON line exceeds maxLineLength (${trimmed.length} > ${this.maxLineLength})`,
					trimmed,
				),
				consumed,
			};
		}
		try {
			return {
				status: "decoded",
				value: JSON.parse(trimmed) as JsonValue,
				consumed,
			};
		} catch (error) {
			return {
				status: "error",
				error: new NdjsonLineError("parse NDJSON line", trimmed, {
					cause: error,
				}),
				consumed,
			};
		}
	}
}
