import { BACKSLASH, DOUBLE_QUOTE, isAsciiWhitespace } from "@ac-kit/core";

import { unescapePoString } from "./_po-string.js";
import { PoSyntaxError } from "./errors.js";
import type { PoEntry, PoPrevious, PoReference } from "./po-entry.js";

/** Which accumulator a bare continuation line appends to. */
type Slot_ =
	| { readonly field: "context" | "id" | "idPlural" }
	| { readonly field: "string"; readonly index: number }
	| { readonly field: "prevContext" | "prevId" | "prevIdPlural" };

type Draft_ = {
	translatorComments: string[];
	extractedComments: string[];
	references: PoReference[];
	flags: string[];
	previous: {
		context: string | null;
		id: string | null;
		idPlural: string | null;
	};
	context: string | null;
	id: string | null;
	idPlural: string | null;
	strings: string[];
	obsolete: boolean;
	slot: Slot_ | null;
	empty: boolean;
};

const KEYWORD_ = /^(msgctxt|msgid_plural|msgid|msgstr(?:\[(\d+)\])?)\s*(.*)$/;
const REFERENCE_ = /^(.*):(\d+)$/;

/**
 * Parses a GNU gettext PO or POT file.
 *
 * Entries come back in file order, including the header (the entry with an
 * empty `id`) and any obsolete `#~` entries, so the list can be printed back
 * without losing anything.
 *
 * @throws {PoSyntaxError} On a line that does not meet the grammar.
 */
export function parsePo(text: string): PoEntry[] {
	const entries: PoEntry[] = [];
	let draft = createDraft_();

	const lines = text.split("\n");
	for (let at = 0; at < lines.length; at++) {
		const lineNumber = at + 1;
		const line = lines[at]!.trim();

		if (line === "") {
			draft = flush_(entries, draft, lineNumber);
			continue;
		}

		// An obsolete entry carries `#~` on every one of its lines, including the
		// `#~|` form of the previous-value block.
		let body = line;
		let obsolete = false;
		if (body.startsWith("#~")) {
			obsolete = true;
			body = body.slice(2).trimStart();
		}

		if (body.startsWith("#") || body.startsWith("|")) {
			if (draft.id !== null) {
				draft = flush_(entries, draft, lineNumber);
			}
			draft.obsolete ||= obsolete;
			draft.empty = false;
			readComment_(draft, body, lineNumber);
			continue;
		}

		if (body.startsWith('"')) {
			appendContinuation_(draft, body, lineNumber);
			continue;
		}

		const keyword = KEYWORD_.exec(body);
		if (keyword === null) {
			throw new PoSyntaxError(lineNumber, "expected a keyword or a string");
		}
		if (
			draft.id !== null &&
			(keyword[1] === "msgctxt" || keyword[1] === "msgid")
		) {
			draft = flush_(entries, draft, lineNumber);
		}
		draft.obsolete ||= obsolete;
		draft.empty = false;
		readKeyword_(draft, keyword, lineNumber);
	}

	flush_(entries, draft, lines.length);
	return entries;
}

function createDraft_(): Draft_ {
	return {
		translatorComments: [],
		extractedComments: [],
		references: [],
		flags: [],
		previous: { context: null, id: null, idPlural: null },
		context: null,
		id: null,
		idPlural: null,
		strings: [],
		obsolete: false,
		slot: null,
		empty: true,
	};
}

function flush_(entries: PoEntry[], draft: Draft_, lineNumber: number): Draft_ {
	if (draft.empty) {
		return draft;
	}
	if (draft.id === null) {
		throw new PoSyntaxError(lineNumber, "entry has no msgid");
	}

	const hasPrevious =
		draft.previous.context !== null ||
		draft.previous.id !== null ||
		draft.previous.idPlural !== null;
	const previous: PoPrevious | null = hasPrevious ? draft.previous : null;

	entries.push({
		translatorComments: draft.translatorComments,
		extractedComments: draft.extractedComments,
		references: draft.references,
		flags: draft.flags,
		previous,
		context: draft.context,
		id: draft.id,
		idPlural: draft.idPlural,
		strings: draft.strings,
		obsolete: draft.obsolete,
	});
	return createDraft_();
}

function readComment_(draft: Draft_, body: string, lineNumber: number): void {
	const isPrevious = body.startsWith("|");
	const marker = isPrevious ? "|" : (body[1] ?? "");
	const rest = body.slice(isPrevious ? 1 : 2).trim();

	switch (marker) {
		case ".":
			draft.extractedComments.push(rest);
			return;

		case ":":
			for (const reference of rest.split(/\s+/)) {
				if (reference === "") {
					continue;
				}
				const match = REFERENCE_.exec(reference);
				draft.references.push(
					match === null
						? { file: reference, line: null }
						: { file: match[1]!, line: Number(match[2]) },
				);
			}
			return;

		case ",":
			for (const flag of rest.split(",")) {
				const trimmed = flag.trim();
				if (trimmed !== "") {
					draft.flags.push(trimmed);
				}
			}
			return;

		case "|": {
			const keyword = KEYWORD_.exec(rest);
			if (keyword === null) {
				appendContinuation_(draft, rest, lineNumber);
				return;
			}
			readPreviousKeyword_(draft, keyword, lineNumber);
			return;
		}

		default:
			draft.translatorComments.push(body.slice(1).trim());
	}
}

function readKeyword_(
	draft: Draft_,
	keyword: RegExpExecArray,
	lineNumber: number,
): void {
	const value = readStrings_(keyword[3]!, lineNumber);

	switch (keyword[1]) {
		case "msgctxt":
			draft.context = value;
			draft.slot = { field: "context" };
			return;
		case "msgid":
			draft.id = value;
			draft.slot = { field: "id" };
			return;
		case "msgid_plural":
			draft.idPlural = value;
			draft.slot = { field: "idPlural" };
			return;
		default: {
			const index = keyword[2] === undefined ? 0 : Number(keyword[2]);
			if (index > draft.strings.length) {
				throw new PoSyntaxError(lineNumber, `msgstr[${index}] is out of order`);
			}
			draft.strings[index] = value;
			draft.slot = { field: "string", index };
		}
	}
}

function readPreviousKeyword_(
	draft: Draft_,
	keyword: RegExpExecArray,
	lineNumber: number,
): void {
	const value = readStrings_(keyword[3]!, lineNumber);

	switch (keyword[1]) {
		case "msgctxt":
			draft.previous.context = value;
			draft.slot = { field: "prevContext" };
			return;
		case "msgid":
			draft.previous.id = value;
			draft.slot = { field: "prevId" };
			return;
		case "msgid_plural":
			draft.previous.idPlural = value;
			draft.slot = { field: "prevIdPlural" };
			return;
		default:
			throw new PoSyntaxError(lineNumber, "msgstr has no previous value");
	}
}

function appendContinuation_(
	draft: Draft_,
	body: string,
	lineNumber: number,
): void {
	const slot = draft.slot;
	if (slot === null) {
		throw new PoSyntaxError(lineNumber, "string continues nothing");
	}

	const value = readStrings_(body, lineNumber);
	switch (slot.field) {
		case "context":
			draft.context += value;
			return;
		case "id":
			draft.id += value;
			return;
		case "idPlural":
			draft.idPlural += value;
			return;
		case "string":
			draft.strings[slot.index] += value;
			return;
		case "prevContext":
			draft.previous.context += value;
			return;
		case "prevId":
			draft.previous.id += value;
			return;
		case "prevIdPlural":
			draft.previous.idPlural += value;
	}
}

/** Adjacent quoted strings on one line concatenate, as they do in C. */
function readStrings_(rest: string, lineNumber: number): string {
	let value = "";
	let at = 0;
	let seen = false;

	while (at < rest.length) {
		if (isAsciiWhitespace(rest.charCodeAt(at))) {
			at++;
			continue;
		}
		if (rest.charCodeAt(at) !== DOUBLE_QUOTE) {
			throw new PoSyntaxError(lineNumber, "expected a quoted string");
		}

		at++;
		const start = at;
		while (at < rest.length && rest.charCodeAt(at) !== DOUBLE_QUOTE) {
			at += rest.charCodeAt(at) === BACKSLASH ? 2 : 1;
		}
		if (at >= rest.length) {
			throw new PoSyntaxError(lineNumber, "unterminated string");
		}
		value += unescapePoString(rest.slice(start, at));
		at++;
		seen = true;
	}

	if (!seen) {
		throw new PoSyntaxError(lineNumber, "expected a quoted string");
	}
	return value;
}
