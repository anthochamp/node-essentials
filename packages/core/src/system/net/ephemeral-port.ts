/** First port of the RFC 6335 dynamic / private range. */
export const EPHEMERAL_PORT_MIN_VALUE = 49152;

/** Last port of the RFC 6335 dynamic / private range. */
export const EPHEMERAL_PORT_MAX_VALUE = 65535;

const EPHEMERAL_PORT_COUNT =
	EPHEMERAL_PORT_MAX_VALUE - EPHEMERAL_PORT_MIN_VALUE + 1;

/**
 * Get a random ephemeral port number in the range suggested by RFC 6335 and the
 * Internet Assigned Numbers Authority (IANA) for dynamic or private ports
 * (between 49152 and 65535).
 *
 * @returns A random ephemeral port number.
 */
export function getRandomEphemeralPort(): number {
	const draw = new Uint16Array(1);
	crypto.getRandomValues(draw);
	// 65536 is an exact multiple of the 16384-port range, so the modulo is unbiased.
	return EPHEMERAL_PORT_MIN_VALUE + (draw[0]! % EPHEMERAL_PORT_COUNT);
}
