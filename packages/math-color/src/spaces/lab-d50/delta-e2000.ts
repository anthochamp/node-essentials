import { DEG_TO_RAD } from "@ac-kit/math-scalar";

import { LabD50 } from "../color-spaces.js";

// The 7th power of 25, used in the CIEDE2000 G factor and RT rotation term.
const POW25_7_ = 25 ** 7;

/**
 * CIEDE2000 ΔE₀₀. Range [0, ~100]. More perceptually uniform than CIE76;
 * corrects known inaccuracies in the blue/grey region via the G factor and the
 * RT rotation term.
 *
 * Typical perceptual thresholds: < 2 — imperceptible or barely noticeable 2–10
 * — clearly perceptible in side-by-side comparison 10–25 — obviously different
 * at a glance
 *
 * > 50 — unambiguously distinct colours
 */
export function deltaE2000(labA: LabD50, labB: LabD50): number {
	// Original chroma magnitudes.
	const c1 = Math.sqrt(labA.a ** 2 + labA.b ** 2);
	const c2 = Math.sqrt(labB.a ** 2 + labB.b ** 2);

	// G: chroma adjustment factor — reduces the influence of the a* axis near grey.
	const cBarPow7 = ((c1 + c2) / 2) ** 7;
	const g = 0.5 * (1 - Math.sqrt(cBarPow7 / (cBarPow7 + POW25_7_)));

	// Adjusted a' and C'.
	const a1p = labA.a * (1 + g);
	const a2p = labB.a * (1 + g);
	const c1p = Math.sqrt(a1p ** 2 + labA.b ** 2);
	const c2p = Math.sqrt(a2p ** 2 + labB.b ** 2);

	// Adjusted hue h' [0, 360).
	const h1p = lchHueAngle_(a1p, labA.b);
	const h2p = lchHueAngle_(a2p, labB.b);

	// ΔL', ΔC', ΔH'.
	const dLp = labB.L - labA.L;
	const dCp = c2p - c1p;
	const dhp = lchHueDelta_(h1p, h2p, c1p, c2p);
	const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp / 2) * DEG_TO_RAD);

	// Arithmetic means L̄', C̄', H̄'.
	const lBarp = (labA.L + labB.L) / 2;
	const cBarp = (c1p + c2p) / 2;
	const hBarp = lchHueMean_(h1p, h2p, c1p, c2p);

	// T: hue-dependent weighting for the H' term.
	const t =
		1 -
		0.17 * Math.cos((hBarp - 30) * DEG_TO_RAD) +
		0.24 * Math.cos(2 * hBarp * DEG_TO_RAD) +
		0.32 * Math.cos((3 * hBarp + 6) * DEG_TO_RAD) -
		0.2 * Math.cos((4 * hBarp - 63) * DEG_TO_RAD);

	// Parametric weighting functions SL, SC, SH.
	const lBarMinus50Sq = (lBarp - 50) ** 2;
	const sl = 1 + (0.015 * lBarMinus50Sq) / Math.sqrt(20 + lBarMinus50Sq);
	const sc = 1 + 0.045 * cBarp;
	const sh = 1 + 0.015 * cBarp * t;

	// RT: rotation term that compensates for CIE76 errors in the blue region.
	const cBarpPow7 = cBarp ** 7;
	const rc = 2 * Math.sqrt(cBarpPow7 / (cBarpPow7 + POW25_7_));
	const dTheta = 30 * Math.exp(-(((hBarp - 275) / 25) ** 2));
	const rt = -Math.sin(2 * dTheta * DEG_TO_RAD) * rc;

	const cTerm = dCp / sc;
	const hTerm = dHp / sh;
	return Math.sqrt(
		(dLp / sl) ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm,
	);
}

// ─── Private helpers ─────────────────────────────────────────────────────────

// Hue angle h' in degrees [0, 360).
// Returns 0 for achromatic inputs (a' = 0 and b = 0).
function lchHueAngle_(aPrime: number, b: number): number {
	if (aPrime === 0 && b === 0) {
		return 0;
	}
	const angle = Math.atan2(b, aPrime) / DEG_TO_RAD;
	return angle < 0 ? angle + 360 : angle;
}

// Δh': hue difference in degrees, handling circular wrap-around.
function lchHueDelta_(h1: number, h2: number, c1: number, c2: number): number {
	if (c1 * c2 === 0) {
		return 0;
	}
	const diff = h2 - h1;
	if (Math.abs(diff) <= 180) {
		return diff;
	}
	return diff > 180 ? diff - 360 : diff + 360;
}

// H̄': mean hue in degrees, handling circular wrap-around.
function lchHueMean_(h1: number, h2: number, c1: number, c2: number): number {
	if (c1 * c2 === 0) {
		return h1 + h2;
	}
	if (Math.abs(h1 - h2) <= 180) {
		return (h1 + h2) / 2;
	}
	const sum = h1 + h2;
	return sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2;
}
