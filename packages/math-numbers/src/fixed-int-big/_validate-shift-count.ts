/**
 * Rejects a shift count no shift here accepts.
 *
 * A negative count is the reason this exists: `bigint`'s `>>` shifts the other
 * way rather than throwing, so `value >> -2n` silently multiplies by four.
 *
 * @throws {RangeError} When `count` is not a non-negative safe integer.
 */
export function validateShiftCount(count: number): void {
	if (!Number.isSafeInteger(count) || count < 0) {
		throw new RangeError(
			`shift count must be a non-negative integer, got ${count}`,
		);
	}
}
