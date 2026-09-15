import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	type EditorConfigProperties,
	type EditorConfigSource,
	parseEditorConfig,
	resolveEditorConfig,
} from "@ac-kit/format-editorconfig";

const FILE_NAME_ = ".editorconfig";

/** Options for {@link readEditorConfigSources}. */
export type EditorConfigWalkOptions = {
	/**
	 * Directory to stop at, even if no `root = true` was found. Defaults to the
	 * filesystem root.
	 */
	readonly stopAt?: string;
};

/**
 * Reads every `.editorconfig` governing `filePath`, outermost first.
 *
 * Ascends from the file's own directory, stopping at the first file declaring
 * `root = true` (that file included) or at
 * {@link EditorConfigWalkOptions.stopAt}. A directory with no `.editorconfig`,
 * or one that cannot be read, is skipped — the search is best-effort by design,
 * since an unreadable parent directory is a permissions fact rather than a
 * configuration error.
 *
 * This is the host-bound half of EditorConfig support;
 * `@ac-kit/format-editorconfig` owns the parsing and resolution and stays
 * portable.
 */
export async function readEditorConfigSources(
	filePath: string,
	options?: EditorConfigWalkOptions,
): Promise<EditorConfigSource[]> {
	const absolute = path.resolve(filePath);
	const stopAt = options?.stopAt ? path.resolve(options.stopAt) : undefined;

	const sources: EditorConfigSource[] = [];
	let directory = path.dirname(absolute);

	for (;;) {
		let contents: string | undefined;
		try {
			contents = await readFile(path.join(directory, FILE_NAME_), "utf-8");
		} catch {
			contents = undefined;
		}

		if (contents !== undefined) {
			const file = parseEditorConfig(contents);
			// Collected innermost first, reversed below: the caller's contract is
			// outermost first, and the root is only discovered on the way up.
			sources.push({ directory: toPosix(directory), file });
			if (file.root) {
				break;
			}
		}

		if (stopAt !== undefined && directory === stopAt) {
			break;
		}
		const parent = path.dirname(directory);
		if (parent === directory) {
			break;
		}
		directory = parent;
	}

	return sources.reverse();
}

/** Resolves the EditorConfig properties that apply to `filePath` on disk. */
export async function readEditorConfig(
	filePath: string,
	options?: EditorConfigWalkOptions,
): Promise<EditorConfigProperties> {
	const sources = await readEditorConfigSources(filePath, options);
	return resolveEditorConfig(sources, toPosix(path.resolve(filePath)));
}

/** Section globs are always `/`-separated, whatever the host uses. */
function toPosix(value: string): string {
	return value.split(path.sep).join("/");
}
