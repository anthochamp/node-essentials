import { partitionIndices, selectAt } from "@ac-kit/algo";
import { defaults } from "@ac-kit/core";
import { sumBy } from "@ac-kit/math-stats";

import { labToLch } from "./conversions/lab-lch.js";
import { labCentroids, LabCentroidsOptions } from "./models/lab-centroids.js";
import { labLightnessCluster } from "./models/lab-lightness-cluster.js";
import { LabWeighted, labWeightedMean } from "./models/lab-weighted-mean.js";
import { IsLabAchromaticStrictness } from "./models/lab.js";
import { lchHueCluster } from "./models/lch-hue-cluster.js";
import { Oklab } from "./spaces/color-spaces.js";
import { oklabIsAchromatic } from "./spaces/oklab/is-achromatic.js";

export type OklabPaletteEntry = {
	/** The OKLab color of the group, weighted by pixel count. */
	color: Oklab;

	/** True if the color group was fully achromatic (gray), false otherwise. */
	achromatic: boolean;

	/**
	 * The fraction of the image covered by this color group, weighted by pixel
	 * count.
	 *
	 * Range: [0, 1]
	 */
	coverage: number;

	/**
	 * Confidence that this color is representative of the group.
	 *
	 * In any group, the colors outside the CIELAB lightness range
	 * (lightnessMin/lightnessMax) are excluded from the weighted mean. In
	 * non-achromatic groups, the colors below the CIELAB chroma threshold
	 * (chromaThreshold) are also excluded from the weighted mean.
	 *
	 * This value is the ratio of the total weight of the colors included in the
	 * weighted mean to the total weight of all colors in the group.
	 *
	 * Range: [0, 1]
	 */
	colorConfidence: number;
};

export type OklabPalette = OklabPaletteEntry[];

export type OklabPaletteOptions = {
	/** Options to pass to the K-means algorithm. Default {}. */
	centroidsOptions?: LabCentroidsOptions;

	/** Number of K-means clusters. Must be > n. Default 16. */
	k?: number;

	/** Maximum number of dominant colors to return. Default 8. */
	n?: number;

	/**
	 * Minimum OKLab chroma C a centroid must be to be considered chromatic.
	 * Default "strict".
	 */
	chromaThreshold?: IsLabAchromaticStrictness | number;

	/** OKLab Hue angle distance threshold in degrees for merging clusters. Default 25. */
	chromaticMergeThreshold?: number;

	/**
	 * OKLab Lightness distance threshold for merging achromatic clusters. Default
	 * 0.15.
	 */
	achromaticMergeThreshold?: number;

	/**
	 * Minimum OKLab lightness L* a centroid may have to be included. Excludes
	 * near-black colors. Default 0.15.
	 */
	lightnessMin?: number;

	/**
	 * Maximum OKLab lightness L* a centroid may have to be included. Excludes
	 * near-white colors. Default 0.85.
	 */
	lightnessMax?: number;

	/**
	 * Minimum fraction of total pixels a group must cover to be included. Default
	 * 0.01.
	 */
	coverageThreshold?: number;
};

const DEFAULT_OPTIONS_: Required<OklabPaletteOptions> = {
	centroidsOptions: {},
	k: 48,
	n: 16,
	chromaThreshold: "strict",
	chromaticMergeThreshold: 25,
	achromaticMergeThreshold: 0.15,
	lightnessMin: 0.15,
	lightnessMax: 0.8,
	coverageThreshold: 0.01,
};

/**
 * Generates a palette of dominant colors from an array of OKLab pixels using
 * K-means clustering and hierarchical clustering.
 *
 * @param pixels - An iterable of OKLab pixels to analyze.
 * @param options - Optional parameters for palette generation.
 * @returns An array of OklabPaletteColor objects representing the dominant
 *   colors and their weights.
 */
export function oklabPalette(
	pixels: Oklab[],
	options?: OklabPaletteOptions,
): OklabPalette {
	const opts = defaults(options ?? {}, DEFAULT_OPTIONS_);

	const centroids = labCentroids(pixels, opts.k, options?.centroidsOptions);

	if (centroids.length === 0) {
		return [];
	}

	const centroidsWithOklch = centroids.map((c) => ({
		oklchColor: labToLch(c.color),
		...c,
	}));

	// Split centroid indices by chroma
	const [chromaticIdx, achromaticIdx] = partitionIndices(
		centroidsWithOklch,
		(p) => !oklabIsAchromatic(p.oklchColor.C, opts.chromaThreshold),
	);

	// Chromatic: cluster by hue
	const chromaticGroups = lchHueCluster(
		chromaticIdx.map((i) => centroidsWithOklch[i]!.oklchColor),
		opts.chromaticMergeThreshold,
	).map((group) => selectAt(chromaticIdx, group));

	// Achromatic: cluster by lightness
	const achromaticGroups = labLightnessCluster(
		achromaticIdx.map((i) => centroids[i]!.color),
		opts.achromaticMergeThreshold,
	).map((group) => selectAt(achromaticIdx, group));

	const groups = [...chromaticGroups, ...achromaticGroups];

	const dominant: OklabPaletteEntry[] = [];
	for (const group of groups) {
		const achromatic = group.every((i) =>
			oklabIsAchromatic(
				centroidsWithOklch[i]!.oklchColor.C,
				opts.chromaThreshold,
			),
		);

		const qualifyingCentroids: LabWeighted<"oklab">[] = [];
		let totalWeight = 0;

		for (const i of group) {
			const { color, weight, oklchColor } = centroidsWithOklch[i]!;

			totalWeight += weight;

			// Exclude any pixels that are outside the lightness range. Also, if the
			// group is chromatic, exclude any pixels that is achromatic.
			if (
				(!achromatic &&
					oklabIsAchromatic(oklchColor.C, opts.chromaThreshold)) ||
				oklchColor.L < opts.lightnessMin ||
				oklchColor.L > opts.lightnessMax
			) {
				continue;
			}

			qualifyingCentroids.push({ color, weight });
		}

		const representativeColor = labWeightedMean(qualifyingCentroids);
		const weightSum = sumBy(qualifyingCentroids, (c) => c.weight);
		const colorConfidence = weightSum / totalWeight;

		if (weightSum === 0 || totalWeight < opts.coverageThreshold) {
			continue;
		}

		dominant.push({
			color: representativeColor,
			achromatic,
			coverage: totalWeight,
			colorConfidence,
		});
	}

	return dominant.toSorted((a, b) => b.coverage - a.coverage).slice(0, opts.n);
}
