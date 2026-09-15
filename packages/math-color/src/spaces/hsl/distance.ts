import { Hsl } from "../color-spaces.js";

/**
 * Weighted HSL distance. Combines hue, saturation, and lightness with hue
 * double-weighted. Range [0, ~2.29].
 */
export function hslDistance(hslA: Hsl, hslB: Hsl): number {
	const hueDelta = Math.abs(hslA.h - hslB.h);
	const dh = ((hueDelta > 180 ? 360 - hueDelta : hueDelta) / 180) * 2;
	const ds = Math.abs(hslA.s - hslB.s);
	const dl = Math.abs(hslA.l - hslB.l) * 0.5;
	return Math.sqrt(dh * dh + ds * ds + dl * dl);
}

/**
 * Circular hue distance using HSL hue. Range [0, 1].
 *
 * Fast but perceptually non-uniform — prefer lchHueDistance when Lab values are
 * already available.
 */
export function hslHueDistance(hslA: Hsl, hslB: Hsl): number {
	const delta = Math.abs(hslA.h - hslB.h);
	return (delta > 180 ? 360 - delta : delta) / 180;
}
