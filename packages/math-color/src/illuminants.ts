import { ChromaticityCoord } from "./chromaticity.js";
import { chromaticityCoordToXyz } from "./conversions/chromaticity-coord-xyz.js";
import { XyzNormalized } from "./models/xyz.js";

/**
 * The ICC PCS (Profile Connection Space) D50 illuminant.
 *
 * This illuminant is used as a reference white point for color management and
 * color space conversions in ICC profiles.
 *
 * Note: The ICC PCS D50 white point values are not strictly equal to the CIE
 * 1931 D50/2° white point.
 */
export const ICC_PCS_D50_WHITE_POINT = {
	x: 0.96422,
	z: 0.82489,
} as const satisfies XyzNormalized;

/** CIE illuminants. */
export type CieIlluminant =
	| "A" // Incandescent/tungsten
	| "B" // Old direct sunlight at noon
	| "C" // Old daylight
	| "D50" // ICC profile PCS
	| "D55" // Mid-morning daylight
	| "D65" // Daylight, sRGB, Adobe-RGB
	| "D75" // North sky daylight
	| "E" // Equal energy
	| "F1" // Daylight Fluorescent
	| "F2" // Cool fluorescent
	| "F3" // White Fluorescent
	| "F4" // Warm White Fluorescent
	| "F5" // Daylight Fluorescent
	| "F6" // Lite White Fluorescent
	| "F7" // Daylight fluorescent, D65 simulator
	| "F8" // Sylvania F40, D50 simulator
	| "F9" // Cool White Fluorescent
	| "F10" // Ultralume 50, Philips TL85
	| "F11" // Ultralume 40, Philips TL84
	| "F12"; // Ultralume 30, Philips TL83

/**
 * CIE 1931 2° Standard Observer xy chromaticity coordinates for various
 * illuminants.
 */
export const CIE_2DEG_OBSERVER_ILLUMINANT_CHROMATICITIES_COORDS = {
	A: { x: 0.44757, y: 0.40745 },
	B: { x: 0.34842, y: 0.35161 },
	C: { x: 0.31006, y: 0.31616 },
	D50: { x: 0.3457, y: 0.3585 },
	D55: { x: 0.33242, y: 0.34743 },
	D65: { x: 0.31272, y: 0.32903 },
	D75: { x: 0.29902, y: 0.31485 },
	E: { x: 0.33333, y: 0.33333 },
	F1: { x: 0.3131, y: 0.33727 },
	F2: { x: 0.37208, y: 0.37529 },
	F3: { x: 0.4091, y: 0.3943 },
	F4: { x: 0.44018, y: 0.40329 },
	F5: { x: 0.31379, y: 0.34531 },
	F6: { x: 0.3779, y: 0.38835 },
	F7: { x: 0.31292, y: 0.32933 },
	F8: { x: 0.34588, y: 0.35875 },
	F9: { x: 0.37417, y: 0.37281 },
	F10: { x: 0.34609, y: 0.35986 },
	F11: { x: 0.38052, y: 0.37713 },
	F12: { x: 0.43695, y: 0.40441 },
} as const satisfies Record<CieIlluminant, ChromaticityCoord>;

/**
 * CIE 1964 10° Supplementary Observer xy chromaticity coordinates for various
 * illuminants.
 *
 * The 10° observer better represents the average human visual response for
 * larger fields of view. The 2° observer is standard for small samples and
 * industry color specifications (sRGB, ICC, CSS Color).
 */
export const CIE_10DEG_OBSERVER_ILLUMINANT_CHROMATICITIES = {
	A: { x: 0.45117, y: 0.40594 },
	B: { x: 0.34981, y: 0.35269 },
	C: { x: 0.31039, y: 0.31904 },
	D50: { x: 0.34773, y: 0.35953 },
	D55: { x: 0.33411, y: 0.34874 },
	D65: { x: 0.31382, y: 0.331 },
	D75: { x: 0.29968, y: 0.3174 },
	E: { x: 0.33333, y: 0.33333 },
	F1: { x: 0.31811, y: 0.33559 },
	F2: { x: 0.37928, y: 0.36723 },
	F3: { x: 0.41761, y: 0.38324 },
	F4: { x: 0.44921, y: 0.39074 },
	F5: { x: 0.31975, y: 0.34246 },
	F6: { x: 0.3866, y: 0.37847 },
	F7: { x: 0.31565, y: 0.32951 },
	F8: { x: 0.34902, y: 0.3594 },
	F9: { x: 0.37828, y: 0.37045 },
	F10: { x: 0.3509, y: 0.35444 },
	F11: { x: 0.38541, y: 0.37109 },
	F12: { x: 0.44256, y: 0.39717 },
} as const satisfies Record<CieIlluminant, ChromaticityCoord>;

export const CIE_D65_WHITE_POINT = chromaticityCoordToXyz(
	CIE_2DEG_OBSERVER_ILLUMINANT_CHROMATICITIES_COORDS.D65,
);

export const OKLAB_WHITE_POINT = ICC_PCS_D50_WHITE_POINT;
