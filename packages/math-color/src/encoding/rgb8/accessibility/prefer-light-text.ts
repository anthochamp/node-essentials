import { Rgb8, RGB8_BLACK, RGB8_WHITE } from "../rgb8.js";
import { apcaContrastLc } from "./apca-contrast-lc.js";

/**
 * Returns true if white foreground text achieves higher absolute APCA Lc
 * contrast against `bg` than black foreground text.
 *
 * Use this to choose between light and dark text overlaid on a background
 * color.
 */
export function preferLightText(bg: Rgb8): boolean {
	return (
		Math.abs(apcaContrastLc(RGB8_WHITE, bg)) >
		Math.abs(apcaContrastLc(RGB8_BLACK, bg))
	);
}
