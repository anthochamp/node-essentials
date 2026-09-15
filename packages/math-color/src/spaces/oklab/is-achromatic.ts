import {
	labIsAchromatic,
	IsLabAchromaticStrictness,
} from "../../models/lab.js";

export const ACHROMATIC_THRESHOLDS_: Record<IsLabAchromaticStrictness, number> =
	{
		"very-strict": 0.03,
		strict: 0.02,
		moderate: 0.01,
		lenient: 0.005,
		"very-lenient": 0.002,
	};

/**
 * Test if an OKLab chroma value is achromatic (gray) based on a specified
 * chroma threshold.
 *
 * @param chroma - The chroma value of the OKLab color
 * @param chromaThreshold - The chroma threshold below which a color is
 *   considered achromatic. Colors with chroma less than this value are treated
 *   as gray.
 * @returns True if the color is achromatic (chroma < chromaThreshold), false
 *   otherwise.
 */
export function oklabIsAchromatic(
	chroma: number,
	chromaThreshold: IsLabAchromaticStrictness | number,
): boolean {
	return labIsAchromatic(chroma, chromaThreshold, ACHROMATIC_THRESHOLDS_);
}
