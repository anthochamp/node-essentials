import { compileGlob } from "@ac-kit/format-glob";

import type { EditorConfigFile } from "./parse-editorconfig.js";
import type { EditorConfigProperties } from "./properties.js";

/**
 * One `.editorconfig` file paired with the directory it was found in.
 *
 * The directory is what a section glob is resolved against, so a caller reading
 * files off disk must report where each came from.
 */
export type EditorConfigSource = {
	/** Directory holding the file, with `/` separators and no trailing slash. */
	readonly directory: string;
	readonly file: EditorConfigFile;
};

/**
 * Expands a section header into the glob the spec says to match.
 *
 * A pattern containing no `/` matches at any depth; one that does is anchored
 * to the directory holding the file. A leading `/` anchors without implying a
 * separator of its own.
 */
function patternFor(directory: string, pattern: string): string {
	const prefix = directory.endsWith("/") ? directory : `${directory}/`;

	if (!pattern.includes("/")) {
		return `${prefix}**/${pattern}`;
	}
	return `${prefix}${pattern.startsWith("/") ? pattern.slice(1) : pattern}`;
}

function merge(
	into: Record<string, unknown>,
	from: EditorConfigProperties,
): void {
	for (const [key, value] of Object.entries(from)) {
		if (value === undefined) {
			continue;
		}
		if (key === "unknown") {
			into.unknown = {
				...(into.unknown as Record<string, string> | undefined),
				...(value as Record<string, string>),
			};
			continue;
		}
		into[key] = value;
	}
}

/**
 * Resolves the properties that apply to `path`.
 *
 * `sources` must be ordered **outermost first** — the root of the search down
 * to the directory holding the file — because a later section overrides an
 * earlier one, and a nearer `.editorconfig` overrides a further one. Reading
 * the files and stopping at `root = true` is the caller's job; that walk is
 * host-bound, and keeping it out is what lets this package stay portable.
 *
 * `indent_size` and `tab_width` are cross-filled per the spec: each defaults to
 * the other where only one was given.
 */
export function resolveEditorConfig(
	sources: readonly EditorConfigSource[],
	path: string,
): EditorConfigProperties {
	const resolved: Record<string, unknown> = {};

	for (const source of sources) {
		for (const section of source.file.sections) {
			const matches = compileGlob(
				patternFor(source.directory, section.pattern),
				"editorconfig",
			);
			if (matches(path)) {
				merge(resolved, section.properties);
			}
		}
	}

	const properties = resolved as EditorConfigProperties;
	if (properties.indentSize === "tab" && properties.tabWidth !== undefined) {
		resolved.indentSize = properties.tabWidth;
	} else if (
		properties.tabWidth === undefined &&
		typeof properties.indentSize === "number"
	) {
		resolved.tabWidth = properties.indentSize;
	}

	return properties;
}
