import { PropertyPath, TextEdit, applyTextEdits } from "@ac-kit/core";
import * as yaml from "yaml";

import { type YamlPrintOptions } from "./print.js";

/**
 * Returns the {@link TextEdit} needed to set `value` at `path`.
 *
 * Medium-fidelity: uses `yaml.Document` mutation then reprints — a single
 * full-replace edit.
 */
export function createYamlEdits(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: yaml.ToStringOptions,
): TextEdit[] {
	const doc = yaml.parseDocument(source);
	doc.setIn(path as (string | number)[], value);
	const newSource = doc.toString(options);
	return [{ offset: 0, length: source.length, content: newSource }];
}

/**
 * Sets `value` at `path` in a YAML string and returns the updated source.
 *
 * Medium-fidelity: uses `yaml.Document` mutation then reprints — preserves
 * structure outside the patched section but discards comments near it.
 */
export function editYaml(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: YamlPrintOptions,
): string {
	return applyTextEdits(source, createYamlEdits(source, path, value, options));
}
