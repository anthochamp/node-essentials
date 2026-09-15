import { BEL_CHAR, ESC_CHAR } from "@ac-kit/core";

/** Wraps `text` in an OSC 8 hyperlink escape sequence pointing at `url`. */
export function hyperlink(url: string, text: string): string {
	return `${ESC_CHAR}]8;;${url}${BEL_CHAR}${text}${ESC_CHAR}]8;;${BEL_CHAR}`;
}
