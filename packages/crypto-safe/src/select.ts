/**
 * Selects every byte of `ifTrue` or every byte of `ifFalse`, combined via an
 * arithmetic mask rather than a per-byte or top-level conditional on
 * `condition`.
 *
 * Note: "Constant-time" is best-effort, not proven: JS gives no such guarantee.
 * Function avoid branching on secret byte _values_ — the only branch either
 * takes is on input _length_, which is a public property of the call (fixed by
 * the algorithm, e.g. a MAC tag size), never secret content.
 *
 * @throws {RangeError} When `ifTrue` and `ifFalse` differ in length.
 */
export function constantTimeSelect(
	condition: boolean,
	ifTrue: Uint8Array,
	ifFalse: Uint8Array,
): Uint8Array<ArrayBuffer> {
	if (ifTrue.length !== ifFalse.length) {
		throw new RangeError(
			"constantTimeSelect: inputs must have the same length",
		);
	}

	const result = new Uint8Array(ifTrue.length);

	// `-Number(condition)` is 0xFFFFFFFF when true, 0 when false — an
	// arithmetic mask derived from `condition`, not a branch on it.
	const trueMask = -Number(condition) & 0xff;
	const falseMask = trueMask ^ 0xff;

	for (let index = 0; index < result.length; index++) {
		result[index] = (ifTrue[index]! & trueMask) | (ifFalse[index]! & falseMask);
	}

	return result;
}
