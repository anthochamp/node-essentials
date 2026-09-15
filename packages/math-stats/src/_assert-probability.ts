/**
 * Rejects a probability outside `[0, 1]`, naming the distribution rather than
 * this module.
 *
 * Shared because every family's `quantile` needs the identical check, and a
 * caller reading one message should not find it worded differently from the
 * next.
 *
 * @param routine Name of the calling export, for the message.
 * @param probability The value to check.
 * @throws {RangeError} When `probability` is outside `[0, 1]` or is `NaN`.
 */
export function assertProbability_(routine: string, probability: number): void {
	if (!(probability >= 0 && probability <= 1)) {
		throw new RangeError(
			`${routine}: probability must be in [0, 1], got ${probability}`,
		);
	}
}
