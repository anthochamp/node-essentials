/** Base class for all CBOR errors this package throws. */
export class CborError extends Error {}

/** A malformed (not well-formed, per RFC 8949 §1.2) encoded CBOR data item. */
export class CborDecodeError extends CborError {
	constructor(message: string) {
		super(message);
		this.name = "CborDecodeError";
	}
}
