import assert from "node:assert";

/** 512×512 and 2048×2048 — a texture and a photograph. */
export const SMALL_IMAGE = 262_144;
export const LARGE_IMAGE = 4_194_304;

/**
 * Deterministic and mirrored exactly by `workload.py`, so the numpy contender
 * converts the identical pixels. Coprime strides with 256 mean every channel
 * sweeps its whole range rather than repeating a short cycle.
 */
export function channelAt(index: number, stride: number): number {
	return (index * stride) % 256;
}

export const RED_STRIDE = 7;
export const GREEN_STRIDE = 13;
export const BLUE_STRIDE = 29;

/** RGBA exactly as `ImageData.data` delivers it — the zero-copy input shape. */
export function rgbaBytes(count: number): Uint8ClampedArray {
	const bytes = new Uint8ClampedArray(count * 4);
	for (let index = 0; index < count; index++) {
		const at = index * 4;
		bytes[at] = channelAt(index, RED_STRIDE);
		bytes[at + 1] = channelAt(index, GREEN_STRIDE);
		bytes[at + 2] = channelAt(index, BLUE_STRIDE);
		bytes[at + 3] = 255;
	}

	return bytes;
}

/** One 24-bit integer per pixel, the shape `colormaps.ts` already uses. */
export function packedRgb(count: number): Uint32Array {
	const packed = new Uint32Array(count);
	for (let index = 0; index < count; index++) {
		packed[index] =
			(channelAt(index, RED_STRIDE) << 16) |
			(channelAt(index, GREEN_STRIDE) << 8) |
			channelAt(index, BLUE_STRIDE);
	}

	return packed;
}

/** `math-color`'s current shape: one object per pixel. */
export function rgb8Objects(
	count: number,
): { r8: number; g8: number; b8: number }[] {
	return Array.from({ length: count }, (_unused, index) => ({
		r8: channelAt(index, RED_STRIDE),
		g8: channelAt(index, GREEN_STRIDE),
		b8: channelAt(index, BLUE_STRIDE),
	}));
}

/**
 * Weights the three axes differently so a contender that permutes them fails.
 * Compared with a tolerance rather than exactly: the conversion runs a cube
 * root and a gamma curve, and the fused kernel reaches the same colour space by
 * a shorter route than the package's XYZ-mediated chain.
 */
/**
 * A summed checksum grows with the pixel count, so the bound has to as well.
 * Stated per pixel, it says what it means: every contender agrees with the
 * package's own conversion to within this much on `L + 3a + 7b`.
 *
 * `5e-3` is the honest level. The fused contenders reach OKLab by Ottosson's
 * direct linear-sRGB→LMS matrix while the package composes sRGB→XYZ→LMS, and
 * the two bake in D65 at different precision — the package carries the
 * five-decimal CIE 15:2004 chromaticities, the published matrix four. That
 * leaves ~4.5e-4 per pixel, which no amount of care removes. A contender that
 * permuted a channel or used the wrong matrix would miss by orders more.
 */
export const PER_PIXEL_TOLERANCE = 5e-3;

export function labChecksum(
	count: number,
	lightnessAt: (index: number) => number,
	aAt: (index: number) => number,
	bAt: (index: number) => number,
): number {
	let total = 0;
	for (let index = 0; index < count; index++) {
		total += lightnessAt(index) + 3 * aAt(index) + 7 * bAt(index);
	}

	return total;
}

export function assertChecksumClose(
	actual: number,
	wanted: number,
	count: number,
): void {
	const difference = Math.abs(actual - wanted);
	assert.ok(
		difference <= PER_PIXEL_TOLERANCE * count,
		`checksum ${actual} differs from ${wanted} by ${(difference / count).toExponential(2)} per pixel, above ${PER_PIXEL_TOLERANCE}`,
	);
}

/**
 * Ottosson (2020): linear sRGB → LMS, then cbrt(LMS) → OKLab. Reaching OKLab
 * this way skips the XYZ leg the package routes through, which is why the two
 * agree only to {@link PER_PIXEL_TOLERANCE}. Shared so the storage suite and
 * the cross-language suite measure the identical kernel.
 */
export const OKLAB_FROM_LINEAR_RGB = {
	lR: 0.412_221_470_8,
	lG: 0.536_332_536_3,
	lB: 0.051_445_992_9,
	mR: 0.211_903_498_2,
	mG: 0.680_699_545_1,
	mB: 0.107_396_956_6,
	sR: 0.088_302_461_9,
	sG: 0.281_718_837_6,
	sB: 0.629_978_700_5,
	labLl: 0.210_454_255_3,
	labLm: 0.793_617_785,
	labLs: -0.004_072_046_8,
	labAl: 1.977_998_495_1,
	labAm: -2.428_592_205,
	labAs: 0.450_593_709_9,
	labBl: 0.025_904_037_1,
	labBm: 0.782_771_766_2,
	labBs: -0.808_675_766,
} as const;

export function srgbToLinear(value: number): number {
	return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/**
 * The sRGB transfer function has only 256 possible inputs, so it can be a table
 * lookup instead of a `Math.pow` per channel — three saved per pixel.
 */
export const LINEAR_FROM_BYTE = new Float64Array(256);
for (let byte = 0; byte < 256; byte++) {
	LINEAR_FROM_BYTE[byte] = srgbToLinear(byte / 255);
}

/** Same rationale as the complex suites: the sampler handles precision. */
export const COLOR_SAMPLING = {
	warmup: 3,
	minRuns: 10,
	maxRuns: 100,
	minTimeMs: 200,
	maxTimeMs: 4_000,
	subtractHarnessOverhead: true,
} as const;
