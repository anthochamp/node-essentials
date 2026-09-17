import { type PortNumber, toPortNumber } from "./port.js";

/** First port of the RFC 6335 dynamic / private range. */
export const EPHEMERAL_PORT_MIN_VALUE = 49152;

/** Last port of the RFC 6335 dynamic / private range. */
export const EPHEMERAL_PORT_MAX_VALUE = 65535;

const EPHEMERAL_PORT_COUNT =
	EPHEMERAL_PORT_MAX_VALUE - EPHEMERAL_PORT_MIN_VALUE + 1;

/**
 * A random port from the range RFC 6335 and IANA set aside for dynamic or
 * private use, 49152 through 65535.
 *
 * Drawn from `crypto.getRandomValues`, so it is unpredictable — which matters
 * when the port is a weak secret, as an ephemeral source port is. It says
 * nothing about whether the port is free; binding is still the only test.
 */
export function getRandomEphemeralPort(): PortNumber {
	const draw = new Uint16Array(1);
	crypto.getRandomValues(draw);

	// 65536 is an exact multiple of the 16384-port range, so the modulo is unbiased.
	// Non-null: the array was allocated with one element.
	return toPortNumber(
		EPHEMERAL_PORT_MIN_VALUE + (draw[0]! % EPHEMERAL_PORT_COUNT),
	);
}

/** Whether the port falls in the IANA ephemeral range. */
export function isEphemeralPort(port: PortNumber): boolean {
	return port >= EPHEMERAL_PORT_MIN_VALUE && port <= EPHEMERAL_PORT_MAX_VALUE;
}
