import { Rgb8 } from "../rgb8.js";
import { wcagRelativeLuminance } from "./wcag-relative-luminance.js";

/**
 * Computes the WCAG 2.x contrast ratio between a foreground and a background
 * color. https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 *
 * The result is in the range [1, 21]. A value of 1 means no contrast (identical
 * colors); 21 means maximum contrast (black on white or vice versa).
 *
 * WCAG 2.x minimum thresholds: - AA normal text: 4.5 - AA large text / UI
 * components: 3 - AAA normal text: 7 - AAA large text: 4.5
 *
 * @param fg - The foreground (text) color with components in the range [0,
 *   255].
 * @param bg - The background color with components in the range [0, 255].
 * @returns The contrast ratio, a value in the range [1, 21].
 */
export function wcagContrastRatio(fg: Rgb8, bg: Rgb8): number {
	const Lfg = wcagRelativeLuminance(fg);
	const Lbg = wcagRelativeLuminance(bg);

	const lighter = Math.max(Lfg, Lbg);
	const darker = Math.min(Lfg, Lbg);

	return (lighter + 0.05) / (darker + 0.05);
}
