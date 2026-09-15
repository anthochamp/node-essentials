import type { BodySpec } from "./body-spec.js";

/**
 * Outcome of one decode attempt.
 *
 * - `incomplete` — more input is needed. `needAtLeast`, when the decoder can
 *   compute it cheaply, is the total buffered unit count below which calling
 *   the decoder again cannot possibly succeed.
 * - `pending` — input is present but only silence delimits the value.
 *   `frameTimeout` is the quiet window after which the decoder is called again
 *   with {@link DecodeContext.timedOut} set. Verified real case: Modbus RTU
 *   delimits frames by 3.5 character-times of silence.
 * - `decoded` — one value decoded. `consumed` units are dropped; an optional
 *   `body` streams the units that follow; optional `warnings` carry best-effort
 *   diagnostics on an otherwise-successful decode (the YAML error/warning
 *   split, or CBOR's "well-formed but invalid" cases per RFC 8949 §5.3.1).
 * - `skip` — `consumed` units were consumed but produced nothing to report: a
 *   blank line, a comment, a byte-order mark. Distinct from `error` (nothing
 *   was wrong) and from `decoded` (there is no value) — collapsing it into
 *   either would force a decoder to fabricate one.
 * - `error` — a recoverable violation. `consumed` units are dropped, the error is
 *   reported, and decoding continues.
 * - `fatal` — synchronisation is lost or the violation cannot be localized to a
 *   consumed span. The source is torn down.
 *
 * Producers (decoders) construct this union and a driver consumes it, so new
 * variants can be added without breaking existing decoders.
 */
export type DecodeResult<T, W = never> =
	| { readonly status: "incomplete"; readonly needAtLeast?: number }
	| { readonly status: "pending"; readonly frameTimeout: number }
	| {
			readonly status: "decoded";
			readonly value: T;
			readonly consumed: number;
			readonly body?: BodySpec;
			readonly warnings?: readonly W[];
	  }
	| { readonly status: "skip"; readonly consumed: number }
	| {
			readonly status: "error";
			readonly error: unknown;
			readonly consumed: number;
	  }
	| { readonly status: "fatal"; readonly error: unknown };

/** Shared `incomplete` result, avoiding an allocation on the common path. */
export const DECODE_INCOMPLETE: DecodeResult<never> = Object.freeze({
	status: "incomplete",
});

/** Build an `incomplete` result carrying a minimum-unit-count hint. */
export function decodeIncomplete(needAtLeast: number): DecodeResult<never> {
	return { status: "incomplete", needAtLeast };
}
