import {
	PropertyPath,
	TextEdit,
	applyTextEdits,
	setAtPath,
} from "@ac-kit/core";
import json5 from "json5";

import { printJson5, type Json5PrintOptions } from "./print.js";

/** Returns a full-replace {@link TextEdit} after setting `value` at `path`. */
export function createJson5Edits(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: Json5PrintOptions,
): TextEdit[] {
	const root = json5.parse<Record<string, unknown>>(source);
	setAtPath(root, path, value);
	const newSource = printJson5(root, options);
	return [{ offset: 0, length: source.length, content: newSource }];
}

/** Sets `value` at `path` in a JSON5 string and returns the updated source. */
export function editJson5(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: Json5PrintOptions,
): string {
	return applyTextEdits(source, createJson5Edits(source, path, value, options));
}
