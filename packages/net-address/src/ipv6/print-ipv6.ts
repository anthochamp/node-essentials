import { printIpv4Address } from "../ipv4/print-ipv4.js";
import {
	type BitAddress,
	assertBitAddressWidth,
} from "../prefix/bit-address.js";
import type { BitPrefix } from "../prefix/bit-prefix.js";
import { IPV6_BIT_WIDTH, IPV6_GROUP_COUNT } from "./constants.js";
import { ipv4FromIpv6, isIpv6Ipv4Mapped } from "./ipv4-mapped.js";
import type { Ipv6ScopedAddress } from "./parse-ipv6.js";

/**
 * The longest run of zero groups, leftmost on a tie; `null` when none is worth
 * compressing.
 */
function longestZeroRun(
	groups: readonly number[],
): { start: number; length: number } | null {
	let best: { start: number; length: number } | null = null;
	let runStart = -1;

	for (let index = 0; index <= groups.length; index++) {
		if (index < groups.length && groups[index] === 0) {
			if (runStart < 0) {
				runStart = index;
			}

			continue;
		}

		if (runStart >= 0) {
			const length = index - runStart;

			// Strictly greater keeps the leftmost run on a tie, as RFC 5952 §4.2.3
			// requires; a single zero group is never compressed (§4.2.2).
			if (length >= 2 && (best === null || length > best.length)) {
				best = { start: runStart, length };
			}

			runStart = -1;
		}
	}

	return best;
}

/**
 * Prints the RFC 5952 canonical form: lowercase, no leading zeros in a group,
 * the longest run of zero groups compressed to `::` — leftmost on a tie, and
 * never for a single group. An IPv4-mapped address is printed `::ffff:a.b.c.d`,
 * per §5.
 *
 * O(1): the address has a fixed eight groups.
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function printIpv6Address(address: BitAddress): string {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	if (isIpv6Ipv4Mapped(address)) {
		// Non-null: a mapped address always embeds an IPv4 address.
		return `::ffff:${printIpv4Address(ipv4FromIpv6(address)!)}`;
	}

	const groups = Array.from({ length: IPV6_GROUP_COUNT }, (_, index): number =>
		Number(
			(address.value >> BigInt((IPV6_GROUP_COUNT - 1 - index) * 16)) & 0xffffn,
		),
	);
	const text = groups.map((group) => group.toString(16));
	const run = longestZeroRun(groups);

	if (run === null) {
		return text.join(":");
	}

	return `${text.slice(0, run.start).join(":")}::${text
		.slice(run.start + run.length)
		.join(":")}`;
}

/**
 * Prints the canonical form followed by `%zone` when the address carries one.
 *
 * The zone is emitted verbatim, not percent-encoded: RFC 6874's `%25` belongs
 * to whatever URI the caller is building.
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function printIpv6ScopedAddress(scoped: Ipv6ScopedAddress): string {
	const text = printIpv6Address(scoped.address);

	return scoped.zoneId === null ? text : `${text}%${scoped.zoneId}`;
}

/**
 * Prints CIDR notation, keeping any host bits the prefix carries.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function printIpv6Prefix(prefix: BitPrefix): string {
	return `${printIpv6Address(prefix.address)}/${prefix.prefixLength}`;
}

/**
 * The `ip6.arpa` name for the address, as RFC 3596 §2.5 defines it: the 32
 * nibbles in reverse order, dot-separated, with no trailing dot.
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function ipv6ReverseName(address: BitAddress): string {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	const nibbles: string[] = [];
	let rest = address.value;

	for (let index = 0; index < IPV6_BIT_WIDTH / 4; index++) {
		nibbles.push(Number(rest & 0xfn).toString(16));
		rest >>= 4n;
	}

	return `${nibbles.join(".")}.ip6.arpa`;
}
