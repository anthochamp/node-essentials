import { styleText, type StyleTextOptions } from "@ac-kit/format-ansi";

import type { Terminal } from "./terminal.js";

/**
 * `styleText`, reading `colorDepth` off `terminal` instead of the caller
 * passing it.
 */
export function styleTextFor(
	terminal: Terminal,
	text: string,
	options: Omit<StyleTextOptions, "colorDepth">,
): string {
	if (!terminal.interactive) {
		return text;
	}

	return styleText(text, { ...options, colorDepth: terminal.colorDepth });
}
