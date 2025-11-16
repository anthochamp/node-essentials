import { UnsupportedError } from "../../ecma/error/unsupported-error.js";

/**
 * Represents an Internet address with IP family and address.
 */
export type InetAddress = {
	/**
	 * IP family: 4 for IPv4, 6 for IPv6, or null for unknown family.
	 */
	family: 4 | 6 | null;
	/**
	 * IP address string.
	 */
	address: string;
};

/**
 * Represents an Internet endpoint with IP family, address, and port.
 */
export type InetEndpoint = InetAddress & {
	/**
	 * Port number.
	 */
	port: number;
};

/**
 * Composes an InetAddress from a family and address.
 * Validates and converts the family to ensure it is 4, 6, or null.
 *
 * @param family The IP family, either as a string ('IPv4', 'IPv6'), number (4, 6), or null for unknown.
 * @param address The IP address string.
 * @returns An InetAddress object.
 * @throws {UnsupportedError} If the family is not valid (not 'IPv4'/'IPv6' or 4/6 or null).
 */
export function composeInetAddress(
	family: string | number | null,
	address: string,
): InetAddress {
	let validatedFamily: 4 | 6 | null;

	if (typeof family === "string") {
		if (family === "IPv4") {
			validatedFamily = 4;
		} else if (family === "IPv6") {
			validatedFamily = 6;
		} else {
			throw new UnsupportedError(
				`Unsupported IP family: ${family}. Expected 'IPv4' or 'IPv6'.`,
			);
		}
	} else if (typeof family === "number") {
		if (family === 4 || family === 6) {
			validatedFamily = family;
		} else {
			throw new UnsupportedError(
				`Unsupported IP family: ${family}. Expected 4 (IPv4) or 6 (IPv6).`,
			);
		}
	} else {
		validatedFamily = null;
	}

	return {
		family: validatedFamily,
		address,
	};
}
