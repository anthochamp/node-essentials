/**
 * Guards the entry points that fit a value to a width. The range queries
 * ({@link fixedUIntBigMax} and the signed pair) are pure functions of the width
 * and answer for a zero-bit integer as readily as any other, so they do not
 * call this.
 *
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function validateBitWidth(bitWidth: number): void {
	if (!Number.isSafeInteger(bitWidth) || bitWidth < 0) {
		throw new RangeError(
			`bit width must be a non-negative integer, got ${bitWidth}`,
		);
	}
}
