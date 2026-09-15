import { BEL_CHAR, ESC_CHAR } from "@ac-kit/core";
import type { Encoder } from "@ac-kit/format-core";

import { AnsiToken, ST } from "./ansi-token.js";

/**
 * Renders one token back to its character form.
 *
 * The single implementation of the ANSI write grammar; this package's named
 * builders (`cursorUp`, `hyperlink`, `styleText`, …) are conveniences that
 * produce the same sequences for the cases callers reach for by name.
 */
export function printAnsiToken(token: AnsiToken): string {
	switch (token.kind) {
		case "text":
			return token.text;
		case "csi":
			return `${ESC_CHAR}[${token.parameters}${token.intermediates}${token.final}`;
		default:
			return `${ESC_CHAR}]${token.body}${
				token.terminator === "bel" ? BEL_CHAR : ST
			}`;
	}
}

/** Creates the ANSI write half: tokens in, escape-sequence text out. */
export function createAnsiEncoder(): Encoder<AnsiToken, string> {
	return { encode: printAnsiToken };
}
