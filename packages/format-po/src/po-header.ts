import type { PoEntry } from "./po-entry.js";

/**
 * The header entry's `Key: value` block, keyed by lower-cased field name.
 *
 * A PO header is an RFC 822-shaped block stored in the `msgstr` of the entry
 * whose `msgid` is empty. Field names are case-insensitive, so they are folded;
 * values are kept verbatim.
 *
 * Unlike a mail header, continuation lines are not defined for PO, so a line
 * without a colon is skipped rather than folded into the one above it.
 */
export function parsePoHeader(
	entries: readonly PoEntry[],
): Map<string, string> {
	const header = entries.find(
		(entry) => entry.id === "" && entry.context === null && !entry.obsolete,
	);

	const fields = new Map<string, string>();
	for (const line of (header?.strings[0] ?? "").split("\n")) {
		const colon = line.indexOf(":");
		if (colon < 0) {
			continue;
		}
		fields.set(
			line.slice(0, colon).trim().toLowerCase(),
			line.slice(colon + 1).trim(),
		);
	}
	return fields;
}
