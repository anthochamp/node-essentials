/**
 * Linear-interpolated quantile of an already-sorted sample.
 *
 * @param sorted Values in ascending order. Not modified, not re-checked.
 * @param fraction Quantile to compute, in `[0, 1]`.
 * @returns The quantile, or `NaN` for an empty sample.
 */
export function quantile(sorted: readonly number[], fraction: number): number {
	if (sorted.length === 0) {
		return Number.NaN;
	}
	if (sorted.length === 1) {
		return sorted[0]!;
	}

	const position = (sorted.length - 1) * fraction;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	if (lower === upper) {
		return sorted[lower]!;
	}
	return (
		sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
	);
}
