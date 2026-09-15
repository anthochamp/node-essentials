import { escapePoString } from "./_po-string.js";
import type { PoEntry } from "./po-entry.js";

/**
 * Serialises PO entries back to a file.
 *
 * The output is the layout `msgcat` produces — comments, then `msgctxt`, then
 * the message, one blank line between entries — except that long lines are not
 * wrapped. Wrapping is cosmetic and lossy to reproduce exactly, so it is left
 * to `msgcat` for anyone who needs byte-identical output.
 */
export function printPo(entries: readonly PoEntry[]): string {
	return entries.map(printEntry_).join("\n");
}

function printEntry_(entry: PoEntry): string {
	const lines: string[] = [];

	for (const comment of entry.translatorComments) {
		lines.push(comment === "" ? "#" : `# ${comment}`);
	}
	for (const comment of entry.extractedComments) {
		lines.push(`#. ${comment}`);
	}
	if (entry.references.length > 0) {
		const references = entry.references.map((reference) =>
			reference.line === null
				? reference.file
				: `${reference.file}:${reference.line}`,
		);
		lines.push(`#: ${references.join(" ")}`);
	}
	if (entry.flags.length > 0) {
		lines.push(`#, ${entry.flags.join(", ")}`);
	}

	// An obsolete entry repeats its marker on every message line, so that
	// uncommenting it is a matter of stripping a fixed prefix.
	const marker = entry.obsolete ? "#~ " : "";
	if (entry.previous !== null) {
		const previousMarker = entry.obsolete ? "#~| " : "#| ";
		if (entry.previous.context !== null) {
			lines.push(
				...printValue_("msgctxt", entry.previous.context, previousMarker),
			);
		}
		if (entry.previous.id !== null) {
			lines.push(...printValue_("msgid", entry.previous.id, previousMarker));
		}
		if (entry.previous.idPlural !== null) {
			lines.push(
				...printValue_("msgid_plural", entry.previous.idPlural, previousMarker),
			);
		}
	}

	if (entry.context !== null) {
		lines.push(...printValue_("msgctxt", entry.context, marker));
	}
	lines.push(...printValue_("msgid", entry.id, marker));

	if (entry.idPlural === null) {
		lines.push(...printValue_("msgstr", entry.strings[0] ?? "", marker));
	} else {
		lines.push(...printValue_("msgid_plural", entry.idPlural, marker));
		for (const [index, plural] of entry.strings.entries()) {
			lines.push(...printValue_(`msgstr[${index}]`, plural, marker));
		}
	}

	return `${lines.join("\n")}\n`;
}

/**
 * One keyword and its value, split across continuation lines at each embedded
 * newline the way every gettext tool writes a multi-line message.
 */
function printValue_(keyword: string, value: string, marker: string): string[] {
	if (!value.includes("\n")) {
		return [`${marker}${keyword} "${escapePoString(value)}"`];
	}

	const segments = value.split("\n");
	const trailing = segments[segments.length - 1] === "";
	if (trailing) {
		segments.pop();
	}

	return [
		`${marker}${keyword} ""`,
		...segments.map((segment, index) => {
			const newline = trailing || index < segments.length - 1 ? "\\n" : "";
			return `${marker}"${escapePoString(segment)}${newline}"`;
		}),
	];
}
