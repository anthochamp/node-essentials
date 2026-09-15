import { ESC_CHAR } from "@ac-kit/core";

/**
 * One unit of an ANSI byte stream.
 *
 * `text` carries everything that is not an escape sequence; the sequence kinds
 * keep their parameter and intermediate bytes verbatim, so an encoder can
 * reproduce the original stream exactly.
 */
export type AnsiToken =
	| { readonly kind: "text"; readonly text: string }
	| {
			/** `ESC [` … final byte: cursor motion, erase, SGR. */
			readonly kind: "csi";
			readonly parameters: string;
			readonly intermediates: string;
			readonly final: string;
	  }
	| {
			/** `ESC ]` … BEL or ST: window title, OSC 8 hyperlink. */
			readonly kind: "osc";
			readonly body: string;
			/** Which terminator closed it, since both are legal and round-trip. */
			readonly terminator: "bel" | "st";
	  };

/** `ESC \` — the String Terminator, the other legal OSC terminator. */
export const ST = `${ESC_CHAR}\\` as const;
