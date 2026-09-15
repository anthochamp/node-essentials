import { LabD50 } from "../color-spaces.js";

/**
 * CIE76 ΔE. Range [0, ~150]. Simple Euclidean distance in Lab — fast but
 * inaccurate for blues and desaturated colours.
 */
export function deltaE76(labA: LabD50, labB: LabD50): number {
	return Math.hypot(labA.L - labB.L, labA.a - labB.a, labA.b - labB.b);
}
