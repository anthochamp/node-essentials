/** Error types for the `@phero/oid` package. */

/**
 * Thrown when an OID value is structurally invalid or cannot be parsed.
 *
 * @spec X.660 §7.1 — Arc identification rules
 * @spec X.680 §32.3 — Object identifier value notation
 */
export class OidError extends Error {
	override readonly name = "OidError";

	constructor(message: string) {
		super(message);
	}
}
