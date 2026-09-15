import { PropertyPath, TextEdit, applyTextEdits } from "@ac-kit/core";
import jsonc, { type FormattingOptions } from "jsonc-parser";

/**
 * Returns the minimal {@link TextEdit}s needed to set `value` at `path`.
 *
 * High-fidelity: uses `jsonc-parser.modify()` — the returned edits are minimal
 * AST patches, so comments on untouched keys are preserved verbatim.
 */
export function createJsoncEdits(
	source: string,
	path: PropertyPath,
	value: unknown,
	formattingOptions?: FormattingOptions,
): TextEdit[] {
	// jsonc-parser's Edit is `{ offset, length, content }` — same as TextEdit
	return jsonc.modify(source, path as (string | number)[], value, {
		formattingOptions,
	}) as TextEdit[];
}

/** Applies {@link createJsoncEdits} result back to `source`. */
export function applyJsoncEdits(source: string, edits: TextEdit[]): string {
	return applyTextEdits(source, edits);
}

/**
 * Sets `value` at `path` in a JSONC source string, preserving comments.
 *
 * Combines {@link createJsoncEdits} and {@link applyJsoncEdits}.
 */
export function editJsonc(
	source: string,
	path: PropertyPath,
	value: unknown,
	formattingOptions?: FormattingOptions,
): string {
	return applyTextEdits(
		source,
		createJsoncEdits(source, path, value, formattingOptions),
	);
}
