import { Rgb8 } from "../rgb8.js";

/**
 * Computes the relative luminance of an sRGB color according to the WCAG 2.x
 * definition. https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * Note: This function intentionally replicates the WCAG 2.x erroneous
 * definition:
 *
 * - Linearization threshold is 0.03928 (WCAG) instead of the correct sRGB value
 *   of 0.04045.
 * - Y coefficients use 4 digits of precision (0.2126, 0.7152, 0.0722) instead of
 *   the more precise ICC values, with the R coefficient truncated rather than
 *   rounded.
 *
 * This matches the WCAG 2.x test suite expectations. Use standard sRGB
 * linearization for color science work unrelated to WCAG conformance.
 *
 * @param value - An sRGB color with components in the range [0, 255].
 * @returns The relative luminance of the color in the range [0, 1].
 */
export function wcagRelativeLuminance(value: Rgb8): number {
	function toLinear(channel: number): number {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}

	return (
		0.2126 * toLinear(value.r8) +
		0.7152 * toLinear(value.g8) +
		0.0722 * toLinear(value.b8)
	);
}
