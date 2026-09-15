import type { NearestColorFinder, Rgb8 } from "@ac-kit/math-color";
import {
	createNearestColorFinder,
	RGB8_BLACK,
	RGB8_WHITE,
	rgb8ToOklab,
} from "@ac-kit/math-color";

// The standard xterm default RGB approximations for the 16 basic/bright ANSI
// colors — indices 0-7 are black/red/green/yellow/blue/magenta/cyan/white,
// 8-15 are their bright counterparts, in that fixed SGR order. Hand-written,
// not generated: there is no official/versioned source for these, only
// long-standing terminal convention (same situation as this repo's
// `CSS_NAMED_COLORS`).
const ANSI_16_PALETTE: readonly Rgb8[] = [
	RGB8_BLACK,
	{ r8: 205, g8: 0, b8: 0 },
	{ r8: 0, g8: 205, b8: 0 },
	{ r8: 205, g8: 205, b8: 0 },
	{ r8: 0, g8: 0, b8: 238 },
	{ r8: 205, g8: 0, b8: 205 },
	{ r8: 0, g8: 205, b8: 205 },
	{ r8: 229, g8: 229, b8: 229 },
	{ r8: 127, g8: 127, b8: 127 },
	{ r8: 255, g8: 0, b8: 0 },
	{ r8: 0, g8: 255, b8: 0 },
	{ r8: 255, g8: 255, b8: 0 },
	{ r8: 92, g8: 92, b8: 255 },
	{ r8: 255, g8: 0, b8: 255 },
	{ r8: 0, g8: 255, b8: 255 },
	RGB8_WHITE,
];

let finder: NearestColorFinder<number> | null = null;

/**
 * The nearest basic/bright ANSI color index (0-15) for `color`, by OKLab
 * (perceptual) distance.
 *
 * The palette is converted on first use, so importing this module costs nothing
 * for a caller that never downsamples.
 */
export function nearestAnsi16(color: Rgb8): number {
	finder ??= createNearestColorFinder(ANSI_16_PALETTE.keys(), (index) =>
		rgb8ToOklab(ANSI_16_PALETTE[index]!),
	);
	return finder(rgb8ToOklab(color));
}
