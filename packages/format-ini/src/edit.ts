import { applyTextEdits, type PropertyPath, type TextEdit } from "@ac-kit/core";

import { parseIniDocument } from "./parse-ini-document.js";
import { parseIni } from "./parse.js";
import { printIni } from "./print.js";

function pathParts(path: PropertyPath): string[] {
	return (Array.isArray(path) ? path : String(path).split(".")).map(String);
}

/**
 * Returns the {@link TextEdit}s that set `value` at `path`.
 *
 * Span-targeted: only the property's own line is rewritten, so comments, blank
 * lines, section order and the formatting of every untouched line survive. A
 * key that does not exist yet is appended to its section, or a new section is
 * appended to the document.
 */
export function createIniEdits(
	source: string,
	path: PropertyPath,
	value: unknown,
): TextEdit[] {
	const parts = pathParts(path);
	const key = parts.pop();
	if (key === undefined) {
		throw new TypeError("path must name at least one key");
	}
	const sectionName = parts.join(".");

	const { nodes } = parseIniDocument(source);
	const rendered = printIni({ [key]: value }).trimEnd();

	let inSection = sectionName.length === 0;
	let sectionEnd: number | undefined;

	for (const node of nodes) {
		if (node.kind === "section") {
			if (inSection && sectionEnd === undefined) {
				sectionEnd = node.span.start;
			}
			inSection = node.name === sectionName;
			continue;
		}
		if (inSection && node.kind === "property" && node.key === key) {
			const comment = node.comment
				? `${node.comment.gap}${node.comment.marker}${node.comment.text}`
				: "";
			return [
				{
					offset: node.span.start,
					length: node.span.end - node.span.start,
					content: `${rendered}${comment}`,
				},
			];
		}
	}

	if (!inSection && sectionEnd === undefined) {
		// The section does not exist: append it, with the property inside.
		const prefix = source.length > 0 && !source.endsWith("\n") ? "\n" : "";
		return [
			{
				offset: source.length,
				length: 0,
				content: `${prefix}[${sectionName}]\n${rendered}\n`,
			},
		];
	}

	const at = sectionEnd ?? source.length;
	const suffix = at === source.length && !source.endsWith("\n") ? "\n" : "";
	return [{ offset: at, length: 0, content: `${suffix}${rendered}\n` }];
}

/** Sets `value` at `path` in an INI string and returns the updated source. */
export function editIni(
	source: string,
	path: PropertyPath,
	value: unknown,
): string {
	return applyTextEdits(source, createIniEdits(source, path, value));
}

/** Reads the value at `path`, or `undefined` when it is absent. */
export function readIni(source: string, path: PropertyPath): unknown {
	let node: unknown = parseIni(source);
	for (const part of pathParts(path)) {
		if (typeof node !== "object" || node === null) {
			return undefined;
		}
		node = (node as Record<string, unknown>)[part];
	}
	return node;
}
