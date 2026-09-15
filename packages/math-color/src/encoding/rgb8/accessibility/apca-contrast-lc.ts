import { Rgb8 } from "../rgb8.js";

/**
 * Computes the APCA (Accessible Perceptual Contrast Algorithm) Lightness
 * Contrast (Lc) between a foreground and a background color.
 *
 * Implements APCA-W3 version 0.0.98G-4g as defined in the W3C CSS Color 5
 * specification. https://www.w3.org/TR/css-color-5/#colorcontrast
 * https://github.com/Myndex/SAPC-APCA
 *
 * The result is Lc, a signed value roughly in the range [-108, 106]: - Positive
 * Lc: darker text on lighter background (normal polarity). - Negative Lc:
 * lighter text on darker background (reverse polarity). - Values between -10
 * and 10 are clamped to 0 (insufficient contrast to measure).
 *
 * Approximate usage thresholds (absolute Lc): - ≥ 75: fluent body text - ≥ 60:
 * large or bold text - ≥ 45: large text or non-text UI elements - ≥ 15:
 * incidental text (disabled, placeholder)
 *
 * @param fg - The foreground (text) color with components in the range [0,
 *   255].
 * @param bg - The background color with components in the range [0, 255].
 * @returns The Lc value.
 */
export function apcaContrastLc(fg: Rgb8, bg: Rgb8): number {
	// Exponents per APCA-W3 0.0.98G-4g
	const normBg = 0.56;
	const normTxt = 0.57;
	const revTxt = 0.62;
	const revBg = 0.65;
	const scale = 1.14;
	const loClip = 0.1;
	const loClipOffset = 0.027;
	const deltaYmin = 0.0005;
	const blkThrs = 0.022;
	const blkClmp = 1.414;

	// Standard sRGB linearization (correct 0.04045 threshold, not WCAG's 0.03928)
	function toLinear(channel: number): number {
		const c = channel / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}

	function sRGBtoY(color: Rgb8): number {
		return (
			0.2126 * toLinear(color.r8) +
			0.7152 * toLinear(color.g8) +
			0.0722 * toLinear(color.b8)
		);
	}

	const Ytxt = sRGBtoY(fg);
	const Ybg = sRGBtoY(bg);

	// Clamp near-zero deltas — too similar to reliably measure
	if (Math.abs(Ybg - Ytxt) < deltaYmin) {
		return 0;
	}

	// Soft-clamp very dark colors to avoid polarity inversion near black
	const pctxt = Ytxt > blkThrs ? Ytxt : Ytxt + (blkThrs - Ytxt) ** blkClmp;
	const pcbg = Ybg > blkThrs ? Ybg : Ybg + (blkThrs - Ybg) ** blkClmp;

	// Compute raw SAPC value based on polarity
	let sapc: number;
	if (pcbg >= pctxt) {
		// Normal polarity: text is darker than background
		sapc = (pcbg ** normBg - pctxt ** normTxt) * scale;
	} else {
		// Reverse polarity: text is lighter than background
		sapc = (pcbg ** revBg - pctxt ** revTxt) * scale;
	}

	// Low-contrast clip
	if (Math.abs(sapc) < loClip) {
		return 0;
	}

	return sapc > 0 ? (sapc - loClipOffset) * 100 : (sapc + loClipOffset) * 100;
}
