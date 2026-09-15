import { defaults } from "@ac-kit/core";

import { labChroma } from "./models/lab.js";
import { Oklab } from "./spaces/color-spaces.js";

export type OklabToneAnalysisOptions = {
	/**
	 * OKLab chroma threshold above which a pixel is counted as vibrant for the
	 * {@link OklabToneAnalysis.vibrantRatio} metric.
	 *
	 * This is an opinionated heuristic, not an industry standard. 0.08
	 * corresponds roughly to a subtly chromatic colour, just past neutral grey.
	 * Adjust to taste: lower values include more nearly-neutral pixels as
	 * vibrant; higher values restrict the count to clearly saturated pixels.
	 *
	 * Default: 0.08.
	 */
	vibrantChromaThreshold?: number;

	/**
	 * OKLab L threshold below which a pixel is counted as a deep shadow for the
	 * {@link OklabToneAnalysis.shadowRatio} metric.
	 *
	 * Range [0, 1]. Default: 0.25.
	 */
	shadowLThreshold?: number;

	/**
	 * OKLab L threshold above which a pixel is counted as a bright highlight for
	 * the {@link OklabToneAnalysis.highlightRatio} metric.
	 *
	 * Range [0, 1]. Default: 0.82.
	 */
	highlightLThreshold?: number;
};

const DEFAULT_OPTIONS_: Required<OklabToneAnalysisOptions> = {
	vibrantChromaThreshold: 0.08,
	shadowLThreshold: 0.25,
	highlightLThreshold: 0.82,
};

/**
 * Per-image tonal statistics derived from OKLab: saturation, lightness, colour
 * temperature, and tonal range.
 */
export type OklabToneAnalysis = {
	/**
	 * Arithmetic mean OKLab chroma C across all opaque pixels.
	 *
	 * A global indicator of image colourfulness: 0 for a perfectly neutral grey
	 * image, approaching 0.4 for a fully saturated image. Range [0, ~0.4].
	 */
	meanOklabChroma: number;

	/**
	 * Fraction of included pixels whose OKLab chroma is ≥
	 * {@link OklabToneAnalysisOptions.vibrantChromaThreshold}.
	 *
	 * Measures how large a proportion of the image consists of noticeably
	 * chromatic pixels. Range [0, 1].
	 */
	vibrantRatio: number;

	/**
	 * Midtone-weighted mean chroma.
	 *
	 * Pixels near middle lightness (L ≈ 0.5) contribute more than deep shadows (L
	 * ≈ 0) or specular highlights (L ≈ 1), where chroma is perceptually less
	 * salient. This metric tracks how colourful the visually dominant midtone
	 * areas of the image are.
	 *
	 * Range [0, ~0.4].
	 */
	vibranceScore: number;

	/**
	 * Arithmetic mean OKLab lightness L across all opaque pixels.
	 *
	 * 0 = perfectly black image; 1 = perfectly white image. Range [0, 1].
	 */
	meanLightness: number;

	/**
	 * Arithmetic mean OKLab a component (red–green chromatic axis) across all
	 * opaque pixels.
	 *
	 * Positive values indicate a warm/reddish cast; negative values indicate a
	 * green cast. Near 0 for neutral images. Range [~-0.4, ~0.4].
	 */
	meanOklabA: number;

	/**
	 * Arithmetic mean OKLab b component (yellow–blue chromatic axis) across all
	 * opaque pixels.
	 *
	 * Positive values indicate a yellow/warm cast; negative values indicate a
	 * blue/cool cast. Near 0 for neutral images. Range [~-0.4, ~0.4].
	 */
	meanOklabB: number;

	/**
	 * Fraction of included pixels with OKLab L <
	 * {@link OklabToneAnalysisOptions.shadowLThreshold} (deep shadows).
	 *
	 * High values indicate a predominantly dark or low-key image. Range [0, 1].
	 */
	shadowRatio: number;

	/**
	 * Fraction of included pixels with OKLab L >
	 * {@link OklabToneAnalysisOptions.highlightLThreshold} (bright highlights).
	 *
	 * High values indicate an airy, high-key, or haze-heavy image. Range [0, 1].
	 */
	highlightRatio: number;

	/**
	 * Variance of OKLab L across all opaque pixels (E[L²] − E[L]²).
	 *
	 * 0 means every pixel has identical lightness; 0.25 is the theoretical
	 * maximum (half pixels at L = 0, half at L = 1). Minimalist images tend to be
	 * < 0.03. Range [0, 0.25].
	 */
	lightnessVariance: number;
};

/**
 * Analyses the tonal and chromatic properties of an image from its pixel data.
 *
 * Converts each pixel above the alpha threshold to OKLab and accumulates
 * statistics covering saturation, lightness, colour temperature, and tonal
 * range.
 *
 * @param imageData - The raw pixel data to analyse (RGBA, 8 bits per channel).
 * @param options - Optional overrides for analysis thresholds.
 * @returns Tonal and chromatic statistics for the image.
 */
export function oklabToneAnalysis(
	pixels: Iterable<Oklab>,
	options?: OklabToneAnalysisOptions,
): OklabToneAnalysis {
	const opts = defaults(options ?? {}, DEFAULT_OPTIONS_);

	let totalChroma = 0;
	let vibrantCount = 0;
	let weightedChromaSum = 0;
	let weightSum = 0;
	let totalLightness = 0;
	let sumL2 = 0;
	let totalOklabA = 0;
	let totalOklabB = 0;
	let shadowCount = 0;
	let highlightCount = 0;
	let opaqueCount = 0;

	for (const pixel of pixels) {
		const chroma = labChroma(pixel);

		// Midtone weight: peaks at L = 0.5, falls to 0 at L = 0 and L = 1.
		const midtoneWeight = 1 - Math.abs(2 * pixel.L - 1);

		totalChroma += chroma;
		weightedChromaSum += chroma * midtoneWeight;
		weightSum += midtoneWeight;
		totalLightness += pixel.L;
		sumL2 += pixel.L * pixel.L;
		totalOklabA += pixel.a;
		totalOklabB += pixel.b;

		if (chroma >= opts.vibrantChromaThreshold) {
			vibrantCount++;
		}
		if (pixel.L < opts.shadowLThreshold) {
			shadowCount++;
		}
		if (pixel.L > opts.highlightLThreshold) {
			highlightCount++;
		}

		opaqueCount++;
	}

	if (opaqueCount === 0) {
		return {
			meanOklabChroma: 0,
			vibrantRatio: 0,
			vibranceScore: 0,
			meanLightness: 0.5,
			meanOklabA: 0,
			meanOklabB: 0,
			shadowRatio: 0,
			highlightRatio: 0,
			lightnessVariance: 0,
		};
	}

	const meanLightness = totalLightness / opaqueCount;

	return {
		meanOklabChroma: totalChroma / opaqueCount,
		vibrantRatio: vibrantCount / opaqueCount,
		vibranceScore: weightSum > 0 ? weightedChromaSum / weightSum : 0,
		meanLightness,
		meanOklabA: totalOklabA / opaqueCount,
		meanOklabB: totalOklabB / opaqueCount,
		shadowRatio: shadowCount / opaqueCount,
		highlightRatio: highlightCount / opaqueCount,
		lightnessVariance: sumL2 / opaqueCount - meanLightness * meanLightness,
	};
}
