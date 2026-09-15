export type TextEdit = {
	/** The offset in the source string where the edit should be applied. */
	offset: number;

	/** The length of the text to replace at the offset. */
	length: number;

	/**
	 * The content to insert at the offset. If `length` is greater than 0, this
	 * content will replace the text at the offset.
	 */
	content: string;
};

/**
 * Applies a set of {@link TextEdit}s to `source`.
 *
 * Edits must be non-overlapping. Applies in descending offset order to avoid
 * invalidating subsequent offsets.
 *
 * @param source The source string to apply edits to
 * @param edits The edits to apply
 * @returns The modified string after applying the edits
 */
export function applyTextEdits(source: string, edits: TextEdit[]): string {
	const sorted = edits.slice().sort((a, b) => b.offset - a.offset);

	let result = source;
	for (const edit of sorted) {
		result =
			result.slice(0, edit.offset) +
			edit.content +
			result.slice(edit.offset + edit.length);
	}
	return result;
}
