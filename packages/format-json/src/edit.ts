import {
	PropertyPath,
	TextEdit,
	applyTextEdits,
	setAtPath,
} from "@ac-kit/core";

import { printJson, type JsonPrintOptions } from "./print.js";

/**
 * Returns the minimal {@link TextEdit}s needed to set `value` at `path`.
 *
 * JSON has no comment syntax, so this always returns a single full-replace edit
 * (parse → mutate → reprint).
 */
export function createJsonEdits(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: JsonPrintOptions,
): TextEdit[] {
	const root = JSON.parse(source) as Record<string, unknown> | unknown[];
	setAtPath(root, path, value);
	const newSource = printJson(root, options);
	return [{ offset: 0, length: source.length, content: newSource }];
}

/**
 * Sets `value` at `path` in a JSON string and returns the updated source.
 *
 * See {@link createJsonEdits} for fidelity notes.
 */
export function editJson(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: JsonPrintOptions,
): string {
	return applyTextEdits(source, createJsonEdits(source, path, value, options));
}
