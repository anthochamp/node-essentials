import type { UnknownRecord } from "type-fest";

import type { IniDocument } from "./ast.js";
import {
	type IniParseOptions,
	parseIniDocument,
} from "./parse-ini-document.js";

/** How a syntax tree is projected onto a plain object. */
export type IniValueOptions = {
	/**
	 * What a repeated key within one section means.
	 *
	 * - `"last"` (default) — later wins, the common configuration-file reading.
	 * - `"first"` — earlier wins.
	 * - `"array"` — every occurrence is collected, in order.
	 *
	 * There is no right answer in general, which is why it is an option rather
	 * than a rule: git config multi-values, `php.ini` overwrites.
	 */
	readonly duplicateKeys?: "last" | "first" | "array";

	/**
	 * Whether a dotted key or section name nests (`a.b = 1` → `{a: {b: 1}}`).
	 *
	 * Off by default: a dot is an ordinary key character in most INI files, and
	 * splitting on it silently rewrites keys that contain one.
	 */
	readonly dottedKeys?: boolean;
};

function assign(
	target: UnknownRecord,
	key: string,
	value: unknown,
	policy: NonNullable<IniValueOptions["duplicateKeys"]>,
): void {
	if (!(key in target)) {
		target[key] = policy === "array" ? [value] : value;
		return;
	}
	if (policy === "first") {
		return;
	}
	if (policy === "last") {
		target[key] = value;
		return;
	}
	(target[key] as unknown[]).push(value);
}

function containerFor(
	root: UnknownRecord,
	path: readonly string[],
): UnknownRecord {
	let node = root;
	for (const part of path) {
		const existing = node[part];
		if (
			existing === undefined ||
			typeof existing !== "object" ||
			existing === null ||
			Array.isArray(existing)
		) {
			const created: UnknownRecord = {};
			node[part] = created;
			node = created;
			continue;
		}
		node = existing as UnknownRecord;
	}
	return node;
}

/** Projects a parsed document onto a plain object. */
export function iniDocumentToValue(
	document: IniDocument,
	options?: IniValueOptions,
): UnknownRecord {
	const duplicateKeys = options?.duplicateKeys ?? "last";
	const dottedKeys = options?.dottedKeys ?? false;

	const root: UnknownRecord = {};
	let section = root;

	for (const node of document.nodes) {
		if (node.kind === "section") {
			const path = dottedKeys ? node.name.split(".") : [node.name];
			section = containerFor(root, path);
			continue;
		}
		if (node.kind !== "property" || node.key.length === 0) {
			continue;
		}
		const value = node.value ?? true;
		if (!dottedKeys) {
			assign(section, node.key, value, duplicateKeys);
			continue;
		}
		const parts = node.key.split(".");
		const leaf = parts.pop()!;
		assign(containerFor(section, parts), leaf, value, duplicateKeys);
	}

	return root;
}

/**
 * Parses INI text into a plain object.
 *
 * A utility over {@link parseIniDocument} and {@link iniDocumentToValue}, not a
 * second implementation of the grammar. Use the document form directly where
 * comments, ordering or spans matter — this projection discards all three, and
 * a repeated section is merged into the one before it.
 */
export function parseIni(
	source: string,
	options?: IniParseOptions & IniValueOptions,
): UnknownRecord {
	return iniDocumentToValue(parseIniDocument(source, options), options);
}
