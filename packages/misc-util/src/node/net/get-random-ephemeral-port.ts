import { randomInt } from "node:crypto";

export const EPHEMERAL_PORT_MIN_VALUE = 49152;
export const EPHEMERAL_PORT_MAX_VALUE = 65535;

/**
 * Get a random ephemeral port number in the range suggested by RFC 6335 and
 * the Internet Assigned Numbers Authority (IANA) for dynamic or private ports
 * (between 49152 and 65535).
 *
 * @returns A random ephemeral port number.
 */
export function getRandomEphemeralPort(): number {
	return randomInt(EPHEMERAL_PORT_MIN_VALUE, EPHEMERAL_PORT_MAX_VALUE + 1);
}
