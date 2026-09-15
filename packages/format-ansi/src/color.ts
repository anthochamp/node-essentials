import type { Rgb8 } from "@ac-kit/math-color";

import { nearestAnsi16 } from "./_ansi-16-palette.js";
import { nearestAnsi256 } from "./_ansi-256-palette.js";

/**
 * Matches `Terminal.colorDepth` (`@ac-kit/app-terminal`) — how many colors can
 * be rendered.
 */
export type ColorDepth = 1 | 4 | 8 | 24;

export type SgrStyleName =
	| "bold"
	| "dim"
	| "italic"
	| "underline"
	| "inverse"
	| "strikethrough";

const STYLE_CODES: Record<SgrStyleName, number> = {
	bold: 1,
	dim: 2,
	italic: 3,
	underline: 4,
	inverse: 7,
	strikethrough: 9,
} as const;

export type StyleTextOptions = {
	/** SGR attributes to apply, e.g. `["bold", "underline"]`. */
	styles?: readonly SgrStyleName[];
	foreground?: Rgb8;
	background?: Rgb8;
	/**
	 * Downsamples requested colors to what this depth can render. Default `24`
	 * (no downsampling).
	 */
	colorDepth?: ColorDepth;
};

function colorCodes(
	color: Rgb8,
	depth: ColorDepth,
	isBackground: boolean,
): readonly number[] {
	if (depth === 24) {
		return [isBackground ? 48 : 38, 2, color.r8, color.g8, color.b8];
	}

	if (depth === 8) {
		return [isBackground ? 48 : 38, 5, nearestAnsi256(color)];
	}

	const index = nearestAnsi16(color);
	const bright = index >= 8;
	const base = isBackground ? (bright ? 100 : 40) : bright ? 90 : 30;
	return [base + (bright ? index - 8 : index)];
}

/**
 * Wraps `text` in SGR escape codes for the requested styles/colors, reset at
 * the end. `foreground`/`background` are always specified as truecolor RGB and
 * downsampled to `colorDepth` here — callers never hand-pick a palette index
 * themselves.
 *
 * `colorDepth: 1` (monochrome) drops `foreground`/`background` entirely; styles
 * (bold, underline, …) still apply, since those aren't color.
 */
export function styleText(text: string, options?: StyleTextOptions): string {
	const depth = options?.colorDepth ?? 24;
	const codes: number[] = [];

	for (const style of options?.styles ?? []) {
		codes.push(STYLE_CODES[style]);
	}

	if (depth !== 1) {
		if (options?.foreground) {
			codes.push(...colorCodes(options.foreground, depth, false));
		}

		if (options?.background) {
			codes.push(...colorCodes(options.background, depth, true));
		}
	}

	if (codes.length === 0) {
		return text;
	}

	return `\u001B[${codes.join(";")}m${text}\u001B[0m`;
}
