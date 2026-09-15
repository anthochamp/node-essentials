import {
	labIsAchromatic,
	IsLabAchromaticStrictness,
} from "../../models/lab.js";

const ACHROMATIC_THRESHOLDS_: Record<IsLabAchromaticStrictness, number> = {
	"very-strict": 2,
	strict: 5,
	moderate: 10,
	lenient: 20,
	"very-lenient": 30,
};

/**
 * Test if a CIE LAB color is achromatic (gray) based on its chroma value and a
 * specified chroma threshold.
 *
 * @param chroma - The chroma value of the CIE LAB color.
 * @param chromaThreshold - The chroma threshold below which a color is
 *   considered achromatic. Colors with chroma less than this value are treated
 *   as gray.
 * @returns True if the color is achromatic (chroma < chromaThreshold), false
 *   otherwise.
 */
export function isCieLabAchromatic(
	chroma: number,
	chromaThreshold: IsLabAchromaticStrictness | number,
): boolean {
	return labIsAchromatic(chroma, chromaThreshold, ACHROMATIC_THRESHOLDS_);
}
