/** Base class for every failure this package reports. */
export class VarintError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VarintError";
	}
}

/**
 * The byte sequence ran out while a continuation bit was still set.
 *
 * Distinct from {@link VarintMalformedError} because it is not necessarily an
 * error at all: a streaming decoder reading from a partially-filled buffer
 * answers it by asking for more input, where a malformed sequence has no
 * recovery.
 */
export class VarintIncompleteError extends VarintError {
	constructor(message: string) {
		super(message);
		this.name = "VarintIncompleteError";
	}
}

/**
 * The byte sequence is well-formed as bytes but not a valid encoding — an
 * overlong (non-minimal) form, a value beyond the representable range, or
 * trailing bytes after a complete value.
 */
export class VarintMalformedError extends VarintError {
	constructor(message: string) {
		super(message);
		this.name = "VarintMalformedError";
	}
}
