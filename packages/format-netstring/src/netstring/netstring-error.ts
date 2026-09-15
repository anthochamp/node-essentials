/**
 * Thrown when a netstring frame cannot be decoded.
 *
 * Recoverable by default: the decoder knows how many bytes to discard, so
 * framing resynchronises at the next length field.
 */
export class NetstringProtocolError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
	}
}
