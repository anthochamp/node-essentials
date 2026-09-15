/**
 * Performs Cantor pairing on two non-negative integers to produce a unique
 * non-negative integer.
 */
export function cantorPairing(x: number, y: number): number {
	return ((x + y) * (x + y + 1)) / 2 + y;
}

/**
 * Performs Cantor unpairing on a non-negative integer to retrieve the original
 * two non-negative integers.
 */
export function cantorUnpairing(z: number): [number, number] {
	const w = Math.floor((Math.sqrt(8 * z + 1) - 1) / 2);
	const t = (w * (w + 1)) / 2;
	const y = z - t;
	const x = w - y;
	return [x, y];
}
