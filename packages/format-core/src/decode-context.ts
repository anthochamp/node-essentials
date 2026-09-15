/**
 * Read-only signal from a driver to a decoder about the state of the source.
 *
 * All fields are optional so a non-live driver (a one-shot buffer, a finished
 * stream) never has to fabricate a context just to satisfy the type.
 */
export interface DecodeContext {
	/** A silence timer armed by a `pending` result has fired. */
	readonly timedOut?: boolean;

	/** No further input will arrive; this is the last chance to decode. */
	readonly atEof?: boolean;

	/**
	 * The view holds exactly one transport-delivered unit (datagram mode). An
	 * `incomplete` result is a truncation error rather than a request for more
	 * input.
	 */
	readonly atMessageBoundary?: boolean;
}
