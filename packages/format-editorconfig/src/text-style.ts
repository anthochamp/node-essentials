import {
	END_OF_LINE_SEQUENCES,
	type EditorConfigProperties,
} from "./properties.js";

/**
 * What a piece of text currently does, in EditorConfig's own vocabulary.
 *
 * Every field is optional for the same reason it is on
 * {@link EditorConfigProperties}: the text may be silent about a property — no
 * indented line reveals nothing about `indent_style` — and "unknown" is not
 * "off".
 */
export type DetectedStyle = Pick<
	EditorConfigProperties,
	| "indentStyle"
	| "indentSize"
	| "endOfLine"
	| "insertFinalNewline"
	| "trimTrailingWhitespace"
>;

/**
 * Reports which EditorConfig properties `content` already satisfies.
 *
 * Mixed line endings leave `endOfLine` unset rather than guessing a winner.
 * `trimTrailingWhitespace` is reported as `true` only when no line has trailing
 * whitespace — the property describes the desired end state, so text that
 * already complies reports the value that would keep it that way.
 */
export function detectEditorConfigStyle(content: string): DetectedStyle {
	const hasCrLf = content.includes("\r\n");
	const hasLf = /(?<!\r)\n/.test(content);
	const hasCr = /\r(?!\n)/.test(content);

	const detected: Record<string, unknown> = {};

	const kinds = [hasLf, hasCrLf, hasCr].filter(Boolean).length;
	if (kinds === 1) {
		detected.endOfLine = hasCrLf ? "crlf" : hasLf ? "lf" : "cr";
	}

	const indent = /^([\t ]+)\S/m.exec(content)?.[1];
	if (indent !== undefined) {
		detected.indentStyle = indent.startsWith("\t") ? "tab" : "space";
		if (detected.indentStyle === "space") {
			detected.indentSize = indent.length;
		}
	}

	if (content.length > 0) {
		detected.insertFinalNewline = /\r?\n$/.test(content);
	}
	detected.trimTrailingWhitespace = !/[\t ]+(?:\r?\n|$)/m.test(content);

	return detected as DetectedStyle;
}

/**
 * Rewrites `content` so it satisfies the properties given.
 *
 * Only the properties present are applied; the rest are left exactly as they
 * are. `indent_style` and `indent_size` are deliberately not applied here —
 * re-indenting requires knowing the language's own nesting, which no text-level
 * rule can supply without corrupting strings and here-docs.
 */
export function applyEditorConfigStyle(
	content: string,
	properties: EditorConfigProperties,
): string {
	let result = content;

	if (properties.trimTrailingWhitespace === true) {
		result = result.replace(/[ \t]+(?=\r?\n|$)/g, "");
	}

	const newline = properties.endOfLine
		? END_OF_LINE_SEQUENCES[properties.endOfLine]
		: undefined;
	if (newline !== undefined) {
		result = result.replace(/\r\n|\n|\r/g, newline);
	}

	if (properties.insertFinalNewline !== undefined) {
		const terminator = /(?:\r\n|\n|\r)$/.exec(result);
		if (properties.insertFinalNewline && terminator === null) {
			result += newline ?? "\n";
		} else if (!properties.insertFinalNewline && terminator !== null) {
			result = result.slice(0, -terminator[0].length);
		}
	}

	return result;
}
