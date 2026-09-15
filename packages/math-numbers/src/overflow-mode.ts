/**
 * Behaviour of a fixed-precision type when the exact result of an operation
 * falls outside its representable range.
 */
export type OverflowMode =
	/** Two's-complement wrap-around, matching hardware integer arithmetic. */
	| "wrap"
	/** Saturate at the minimum or maximum representable value. */
	| "clamp"
	/** Throw {@link OverflowError}. */
	| "abort";

/** Raised by an operation performed under the `abort` overflow mode. */
export class OverflowError extends RangeError {
	override readonly name = "OverflowError";

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
	}
}
