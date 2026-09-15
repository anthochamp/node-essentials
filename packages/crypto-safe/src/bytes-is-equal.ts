/**
 * Compares two byte strings without short-circuiting on the first mismatch.
 *
 * Note: "Constant-time" is best-effort, not proven: JS gives no such guarantee.
 * Function avoid branching on secret byte _values_ — the only branch either
 * takes is on input _length_, which is a public property of the call (fixed by
 * the algorithm, e.g. a MAC tag size), never secret content.
 *
 * @throws {RangeError} When `a` and `b` differ in length. Real callers always
 *   know the expected length in advance (e.g. a MAC tag size) — treating a
 *   length mismatch as a hard error rather than silently returning `false`
 *   catches a caller comparing against the wrong tag size entirely.
 */
export function constantTimeBytesIsEqual(
	a: Uint8Array,
	b: Uint8Array,
): boolean {
	if (a.length !== b.length) {
		throw new RangeError(
			"constantTimeBytesIsEqual: inputs must have the same length",
		);
	}

	let diff = 0;

	for (let index = 0; index < a.length; index++) {
		diff |= a[index]! ^ b[index]!;
	}

	return diff === 0;
}
