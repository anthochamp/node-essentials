/**
 * Declares that the bytes/units immediately following a decoded value are an
 * opaque payload the driver should stream rather than buffer.
 *
 * The decoder never owns the body stream — it only states how the body ends.
 * The driver creates the {@link ReadableStream}, applies backpressure while the
 * consumer drains it, and resumes decoding at the unit after the body. This is
 * what keeps large payloads (HTTP bodies, IMAP literals, WebSocket payloads,
 * RIFF/AVI `movi` chunks) out of the receive buffer entirely.
 */
export type BodySpec =
	| { readonly mode: "length"; readonly byteLength: number }
	| { readonly mode: "until-eof" };
