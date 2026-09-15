import { ChromaticityCoord } from "../chromaticity.js";
import { XyzNormalized } from "../models/xyz.js";

/**
 * Converts CIE xy chromaticity coordinates to a normalized XYZ white point
 * (Y=1).
 */
export function chromaticityCoordToXyz(xy: ChromaticityCoord): XyzNormalized {
	return { x: xy.x / xy.y, z: (1 - xy.x - xy.y) / xy.y };
}
