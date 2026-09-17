import { NetAddressSyntaxError } from "../errors.js";
import { tryParseIpv4Address } from "../ipv4/parse-ipv4.js";
import { printIpv4Address } from "../ipv4/print-ipv4.js";
import {
	type Ipv6ScopedAddress,
	tryParseIpv6ScopedAddress,
} from "../ipv6/parse-ipv6.js";
import { printIpv6ScopedAddress } from "../ipv6/print-ipv6.js";
import type { BitAddress } from "../prefix/bit-address.js";
import { type PortNumber, tryParsePort } from "./port.js";

/**
 * What the host part of an endpoint turned out to be.
 *
 * A registered name stays a name even when it is all digits: `2130706433` is a
 * name here, not an address, because only a resolver can say what it points at.
 * An allowlist must classify what the resolver returned, never this string.
 */
export type EndpointHost =
	| { readonly kind: "ipv4"; readonly address: BitAddress }
	| {
			readonly kind: "ipv6";
			readonly address: BitAddress;
			readonly zoneId: string | null;
	  }
	| { readonly kind: "name"; readonly name: string };

/** A host with an optional port — `example.org:443`, `[::1]:8080`, `10.0.0.1`. */
export type NetEndpoint = {
	readonly host: EndpointHost;
	readonly port: PortNumber | null;
};

const REGISTERED_NAME_PATTERN = /^[0-9a-zA-Z._~%!$&'()*+,;=-]+$/;

function splitHostAndPort(text: string): [string, string | null] | null {
	if (text.startsWith("[")) {
		const closing = text.indexOf("]");

		if (closing < 0) {
			return null;
		}

		const rest = text.slice(closing + 1);
		const inside = text.slice(1, closing);

		if (rest === "") {
			return [inside, null];
		}

		return rest.startsWith(":") ? [inside, rest.slice(1)] : null;
	}

	const colon = text.indexOf(":");

	// An unbracketed literal with more than one colon is an IPv6 address written
	// without its brackets, which RFC 3986 §3.2.2 does not allow — and accepting
	// it would make `::1:8080` ambiguous.
	if (colon < 0) {
		return [text, null];
	}

	return text.includes(":", colon + 1)
		? null
		: [text.slice(0, colon), text.slice(colon + 1)];
}

/**
 * Parses `host`, `host:port`, `[v6]` or `[v6]:port`, with the bracket form of
 * RFC 3986 §3.2.2.
 *
 * An IPv6 literal must be bracketed, so a port can never be mistaken for the
 * final group. Inside the brackets a zone identifier is taken verbatim after
 * `%`; RFC 6874's `%25` encoding is the caller's to decode.
 *
 * @throws NetAddressSyntaxError When `text` is not an endpoint.
 */
export function parseEndpoint(text: string): NetEndpoint {
	const endpoint = tryParseEndpoint(text);

	if (endpoint === null) {
		throw new NetAddressSyntaxError(text, "not a host or host:port endpoint");
	}

	return endpoint;
}

/** {@link parseEndpoint}, answering `null` instead of throwing. O(1). */
export function tryParseEndpoint(text: string): NetEndpoint | null {
	const split = splitHostAndPort(text);

	if (split === null) {
		return null;
	}

	const [hostText, portText] = split;
	const port = portText === null ? null : tryParsePort(portText);

	if (portText !== null && port === null) {
		return null;
	}

	const host = tryParseEndpointHost(hostText, text.startsWith("["));

	return host === null ? null : { host, port };
}

function tryParseEndpointHost(
	hostText: string,
	bracketed: boolean,
): EndpointHost | null {
	if (bracketed) {
		const scoped: Ipv6ScopedAddress | null =
			tryParseIpv6ScopedAddress(hostText);

		return scoped === null
			? null
			: { kind: "ipv6", address: scoped.address, zoneId: scoped.zoneId };
	}

	const ipv4 = tryParseIpv4Address(hostText);

	if (ipv4 !== null) {
		return { kind: "ipv4", address: ipv4 };
	}

	return REGISTERED_NAME_PATTERN.test(hostText)
		? { kind: "name", name: hostText }
		: null;
}

/**
 * Prints the endpoint, bracketing an IPv6 host whenever a port is present — and
 * also when it is not, so the result is always safe to concatenate a `:port`
 * onto.
 */
export function printEndpoint(endpoint: NetEndpoint): string {
	const host = printEndpointHost(endpoint.host);

	return endpoint.port === null ? host : `${host}:${endpoint.port}`;
}

/** Prints the host alone, bracketing an IPv6 literal. */
export function printEndpointHost(host: EndpointHost): string {
	switch (host.kind) {
		case "ipv4": {
			return printIpv4Address(host.address);
		}
		case "ipv6": {
			return `[${printIpv6ScopedAddress({
				address: host.address,
				zoneId: host.zoneId,
			})}]`;
		}
		case "name": {
			return host.name;
		}
	}
}
