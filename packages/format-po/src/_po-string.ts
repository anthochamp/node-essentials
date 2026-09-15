/** C-style string escaping, as `po-lex.c` reads and writes it. */

import {
	BACKSLASH,
	BEL,
	BS,
	CR,
	DEL,
	DIGIT_ZERO,
	DOUBLE_QUOTE,
	FF,
	HT,
	isAsciiHexDigit,
	isAsciiOctalDigit,
	LF,
	LOWERCASE_A,
	LOWERCASE_B,
	LOWERCASE_F,
	LOWERCASE_N,
	LOWERCASE_R,
	LOWERCASE_T,
	LOWERCASE_V,
	LOWERCASE_X,
	SPACE,
	VT,
} from "@ac-kit/core";

const UNESCAPED_ = new Map<number, number>([
	[LOWERCASE_A, BEL],
	[LOWERCASE_B, BS],
	[LOWERCASE_F, FF],
	[LOWERCASE_N, LF],
	[LOWERCASE_R, CR],
	[LOWERCASE_T, HT],
	[LOWERCASE_V, VT],
	[BACKSLASH, BACKSLASH],
	[DOUBLE_QUOTE, DOUBLE_QUOTE],
]);

const ESCAPED_ = new Map<number, string>([
	[BEL, "\\a"],
	[BS, "\\b"],
	[FF, "\\f"],
	[LF, "\\n"],
	[CR, "\\r"],
	[HT, "\\t"],
	[VT, "\\v"],
	[BACKSLASH, "\\\\"],
	[DOUBLE_QUOTE, '\\"'],
]);

const OCTAL_DIGITS_ = 3;
const HEX_DIGITS_ = 2;

/**
 * Decodes the body of a quoted PO string.
 *
 * An unrecognised escape yields the escaped character itself, which is what
 * gettext does after warning about it — refusing the file outright would reject
 * input every other tool accepts.
 */
export function unescapePoString(body: string): string {
	let at = body.indexOf("\\");
	if (at < 0) {
		return body;
	}

	// Copied in runs between escapes rather than a character at a time, since a
	// PO string is mostly literal text.
	let out = body.slice(0, at);
	while (at < body.length) {
		if (body.charCodeAt(at) !== BACKSLASH) {
			const next = body.indexOf("\\", at);
			out += next < 0 ? body.slice(at) : body.slice(at, next);
			if (next < 0) {
				break;
			}
			at = next;
			continue;
		}

		at++;
		if (at >= body.length) {
			out += "\\";
			break;
		}

		const escape = body.charCodeAt(at);
		at++;

		const simple = UNESCAPED_.get(escape);
		if (simple !== undefined) {
			out += String.fromCharCode(simple);
			continue;
		}

		if (isAsciiOctalDigit(escape)) {
			let value = escape - DIGIT_ZERO;
			for (
				let digit = 1;
				digit < OCTAL_DIGITS_ && isAsciiOctalDigit(body.charCodeAt(at));
				digit++
			) {
				value = value * 8 + (body.charCodeAt(at) - DIGIT_ZERO);
				at++;
			}
			out += String.fromCharCode(value);
			continue;
		}

		if (escape === LOWERCASE_X) {
			const start = at;
			while (at - start < HEX_DIGITS_ && isAsciiHexDigit(body.charCodeAt(at))) {
				at++;
			}
			out +=
				at === start
					? "x"
					: String.fromCharCode(Number.parseInt(body.slice(start, at), 16));
			continue;
		}

		out += String.fromCharCode(escape);
	}

	return out;
}

/**
 * Encodes a string as the body of a quoted PO string.
 *
 * A control character without a named escape becomes three-digit octal rather
 * than `\x`, because gettext reads a hex escape greedily and would swallow a
 * following hex digit that was meant to be literal text.
 */
export function escapePoString(value: string): string {
	let out = "";
	for (let at = 0; at < value.length; at++) {
		const code = value.charCodeAt(at);

		const named = ESCAPED_.get(code);
		if (named !== undefined) {
			out += named;
			continue;
		}
		if (code < SPACE || code === DEL) {
			out += `\\${code.toString(8).padStart(OCTAL_DIGITS_, "0")}`;
			continue;
		}
		out += value[at];
	}
	return out;
}
