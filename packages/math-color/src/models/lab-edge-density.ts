import { LabCoords } from "./lab.js";

/**
 * Computes the mean gradient magnitude of the OKLab L channel across all
 * interior pixels.
 *
 * Uses a central-difference approximation (one-step horizontal and vertical):
 *
 *     dx = L[x+1, y] − L[x−1, y]
 *     dy = L[x, y+1] − L[x, y−1]
 *     magnitude = √(dx² + dy²)
 *
 * Border pixels are excluded (no padding or clamping applied). At a typical 80
 * × 80 downscale this covers ~6 241 interior pixels — negligible cost.
 *
 * For OKLab, range is [0, ~1.41]. Typical values: featureless sky ≈ 0.005, calm
 * landscape ≈ 0.02–0.04, busy scene ≥ 0.06. For CIE L_a_b*, range is [0,
 * ~2.55]. Typical values: featureless sky ≈ 0.01, calm landscape ≈ 0.04–0.08,
 * busy scene ≥ 0.12.
 *
 * @param pixels - Flat row-major pixel array
 * @param width - Width of the source image in pixels
 * @returns Mean gradient magnitude.
 */
export function labEdgeDensity(
	pixels: readonly LabCoords[],
	width: number,
): number {
	const height = Math.floor(pixels.length / width);

	let total = 0;
	let count = 0;

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const i = y * width + x;

			const { L: L1 } = pixels[i - 1]!;
			const { L: L2 } = pixels[i + 1]!;
			const { L: L3 } = pixels[(y - 1) * width + x]!;
			const { L: L4 } = pixels[(y + 1) * width + x]!;

			const dx = L2 - L1;
			const dy = L4 - L3;

			total += Math.hypot(dx, dy);
			count++;
		}
	}

	return count > 0 ? total / count : 0;
}
