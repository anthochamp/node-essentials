/**
 * Removes the longest whitespace prefix shared by every non-blank line.
 *
 * The inverse of {@link prefixLines}: text indented to sit inside a block of
 * code reads as an accident once it is lifted out of it. Blank lines are
 * ignored when measuring, since a trailing line of zero length would otherwise
 * force the common prefix to the empty string; they are emitted as empty rather
 * than kept as runs of spaces.
 *
 * Tabs and spaces are compared as characters, not expanded to columns — mixing
 * them within one block is what makes an expansion necessary, and guessing a
 * tab width there would silently pick one indentation over another.
 *
 * O(n) in the total length of the text.
 *
 * @param text The text to dedent, as a string or as lines.
 * @returns The dedented lines.
 */
export function dedentLines(text: string | string[]): string[] {
	const lines = (Array.isArray(text) ? text : [text]).flatMap((line) =>
		line.split(/\r?\n/),
	);

	let common: string | null = null;
	for (const line of lines) {
		if (line.trim().length === 0) {
			continue;
		}
		const indent = /^[ \t]*/.exec(line)?.[0] ?? "";
		if (common === null) {
			common = indent;
			continue;
		}
		let shared = 0;
		while (
			shared < common.length &&
			shared < indent.length &&
			common[shared] === indent[shared]
		) {
			shared++;
		}
		common = common.slice(0, shared);
	}

	const width = common?.length ?? 0;
	return lines.map((line) =>
		line.trim().length === 0 ? "" : line.slice(width),
	);
}

/**
 * {@link dedentLines}, rejoined with `\n`.
 *
 * @param text The text to dedent.
 * @returns The dedented text.
 */
export function dedent(text: string | string[]): string {
	return dedentLines(text).join("\n");
}
