import { isAsciiDigit } from "@ac-kit/core";

import { NetAddressSyntaxError } from "../errors.js";

declare const portNumberTag: unique symbol;

/**
 * A validated TCP or UDP port number.
 *
 * The tag is declared, never constructed, so the type costs nothing at runtime.
 * It exists so a function taking a port cannot be handed an arbitrary `number`
 * that nobody range-checked: the only ways in are {@link toPortNumber},
 * {@link parsePort} and the {@link isPortNumber} guard.
 */
export type PortNumber = number & { readonly [portNumberTag]: true };

/** The lowest port number. RFC 6335 reserves it and it is never assigned. */
export const PORT_MIN_VALUE = 0;

/** The highest port number: ports are a 16-bit field. */
export const PORT_MAX_VALUE = 65_535;

/** Last of the RFC 6335 System (well-known) range. */
export const SYSTEM_PORT_MAX_VALUE = 1023;

/** First of the RFC 6335 User (registered) range. */
export const USER_PORT_MIN_VALUE = 1024;

/** Last of the RFC 6335 User (registered) range. */
export const USER_PORT_MAX_VALUE = 49_151;

/** Whether `value` is an integer in `[0, 65535]`. */
export function isPortNumber(value: number): value is PortNumber {
	return (
		Number.isInteger(value) &&
		value >= PORT_MIN_VALUE &&
		value <= PORT_MAX_VALUE
	);
}

/**
 * Narrows a number to a {@link PortNumber}.
 *
 * @throws RangeError When `value` is not an integer in `[0, 65535]`.
 */
export function toPortNumber(value: number): PortNumber {
	if (!isPortNumber(value)) {
		throw new RangeError(`not a port number: ${value}`);
	}

	return value;
}

/**
 * Parses a decimal port number, strictly: digits only, no sign, no leading
 * zero, no whitespace.
 *
 * A leading zero is rejected for the same reason `parseIpv4Address` rejects it
 * — `080` must not read as 80 here and as something else in the next hop's
 * parser. O(1).
 *
 * @throws NetAddressSyntaxError When `text` is not such a number, or is out of
 *   range.
 */
export function parsePort(text: string): PortNumber {
	const port = tryParsePort(text);

	if (port === null) {
		throw new NetAddressSyntaxError(text, "not a port number");
	}

	return port;
}

/** {@link parsePort}, answering `null` instead of throwing. O(1). */
export function tryParsePort(text: string): PortNumber | null {
	if (text.length === 0 || text.length > 5) {
		return null;
	}

	if (text.length > 1 && text.charCodeAt(0) === 0x30) {
		return null;
	}

	let value = 0;

	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);

		if (!isAsciiDigit(code)) {
			return null;
		}

		value = value * 10 + (code - 0x30);
	}

	return isPortNumber(value) ? value : null;
}

/** Prints the port as a decimal number. */
export function printPort(port: PortNumber): string {
	return String(port);
}

/** The RFC 6335 §6 ranges. */
export type PortRange =
	/** 0–1023, assigned by IANA after IETF review. */
	| "system"
	/** 1024–49151, assigned by IANA on request. */
	| "user"
	/** 49152–65535, never assigned; free for ephemeral use. */
	| "dynamic";

/**
 * Which RFC 6335 range a port falls in.
 *
 * Port 0 answers `"system"` — it sits in that numeric range even though RFC
 * 6335 reserves it and no service is ever assigned to it.
 */
export function classifyPort(port: PortNumber): PortRange {
	if (port <= SYSTEM_PORT_MAX_VALUE) {
		return "system";
	}

	return port <= USER_PORT_MAX_VALUE ? "user" : "dynamic";
}

/** Whether the port is in the IANA-assigned well-known range. */
export function isWellKnownPort(port: PortNumber): boolean {
	return classifyPort(port) === "system";
}

/** Whether the port is in the IANA registered range. */
export function isRegisteredPort(port: PortNumber): boolean {
	return classifyPort(port) === "user";
}

/** Whether the port is in the dynamic / private range. */
export function isDynamicPort(port: PortNumber): boolean {
	return classifyPort(port) === "dynamic";
}
