/**
 * Throws unless `prefixLength` names a valid cut of a `bitWidth`-bit address.
 *
 * @throws RangeError When it is not an integer in `[0, bitWidth]`.
 */
export function assertPrefixLength(
	prefixLength: number,
	bitWidth: number,
): void {
	if (
		!Number.isInteger(prefixLength) ||
		prefixLength < 0 ||
		prefixLength > bitWidth
	) {
		throw new RangeError(
			`prefix length must be an integer in [0, ${bitWidth}], got ${prefixLength}`,
		);
	}
}
