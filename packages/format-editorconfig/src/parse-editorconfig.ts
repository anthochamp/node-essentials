import { setRecordEntry } from "@ac-kit/core";
import { parseIniDocument } from "@ac-kit/format-ini";

import type { EditorConfigProperties } from "./properties.js";

/**
 * One `.editorconfig` file: its `root` flag and its sections, in source order.
 *
 * Order is load-bearing — a later matching section overrides an earlier one —
 * which is why this is a list rather than a map.
 */
export type EditorConfigFile = {
	/** `root = true` in the preamble stops the search at this file. */
	readonly root: boolean;
	readonly sections: readonly EditorConfigSection[];
};

/** One `[glob]` section. */
export type EditorConfigSection = {
	/** The section header verbatim, to be matched with the editorconfig dialect. */
	readonly pattern: string;
	readonly properties: EditorConfigProperties;
};

const KNOWN_ = new Set([
	"indent_style",
	"indent_size",
	"tab_width",
	"end_of_line",
	"charset",
	"trim_trailing_whitespace",
	"insert_final_newline",
	"max_line_length",
]);

function toBoolean(raw: string): boolean | undefined {
	if (raw === "true") {
		return true;
	}
	if (raw === "false") {
		return false;
	}
	return undefined;
}

function toNumber(raw: string): number | undefined {
	const value = Number(raw);
	return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function assignProperty(
	target: Record<string, unknown>,
	unknown: Record<string, string>,
	name: string,
	raw: string,
): void {
	// The spec lower-cases both halves, and `unset` means "say nothing", which is
	// the same as never having been written.
	if (raw === "unset") {
		return;
	}

	if (!KNOWN_.has(name)) {
		setRecordEntry(unknown, name, raw);
		return;
	}

	switch (name) {
		case "indent_style":
			if (raw === "tab" || raw === "space") {
				target.indentStyle = raw;
			}
			break;
		case "indent_size":
			target.indentSize = raw === "tab" ? "tab" : toNumber(raw);
			break;
		case "tab_width":
			target.tabWidth = toNumber(raw);
			break;
		case "end_of_line":
			if (raw === "lf" || raw === "crlf" || raw === "cr") {
				target.endOfLine = raw;
			}
			break;
		case "charset":
			target.charset = raw;
			break;
		case "trim_trailing_whitespace":
			target.trimTrailingWhitespace = toBoolean(raw);
			break;
		case "insert_final_newline":
			target.insertFinalNewline = toBoolean(raw);
			break;
		default:
			target.maxLineLength = raw === "off" ? "off" : toNumber(raw);
			break;
	}

	if (target[camelOf(name)] === undefined) {
		delete target[camelOf(name)];
	}
}

function camelOf(name: string): string {
	return name.replace(/_(\w)/g, (_match, char: string) => char.toUpperCase());
}

/**
 * Parses one `.editorconfig` file.
 *
 * The INI syntax comes from `@ac-kit/format-ini`'s order-preserving document
 * tree; everything here is the EditorConfig semantics layered on top — property
 * names and values are case-insensitive, `unset` erases, and anything the spec
 * does not define is preserved rather than dropped.
 */
export function parseEditorConfig(source: string): EditorConfigFile {
	const { nodes } = parseIniDocument(source);

	let root = false;
	const sections: EditorConfigSection[] = [];
	let current:
		| {
				pattern: string;
				target: Record<string, unknown>;
				unknown: Record<string, string>;
		  }
		| undefined;

	const flush = (): void => {
		if (!current) {
			return;
		}
		const properties = current.target as EditorConfigProperties;
		sections.push({
			pattern: current.pattern,
			properties:
				Object.keys(current.unknown).length > 0
					? { ...properties, unknown: current.unknown }
					: properties,
		});
	};

	for (const node of nodes) {
		if (node.kind === "section") {
			flush();
			current = { pattern: node.raw.trim(), target: {}, unknown: {} };
			continue;
		}
		if (node.kind !== "property" || node.value === undefined) {
			continue;
		}
		const name = node.key.toLowerCase();
		const raw = node.value.toLowerCase();

		if (!current) {
			// Preamble: only `root` is defined there.
			if (name === "root") {
				root = toBoolean(raw) ?? false;
			}
			continue;
		}
		assignProperty(current.target, current.unknown, name, raw);
	}
	flush();

	return { root, sections };
}
