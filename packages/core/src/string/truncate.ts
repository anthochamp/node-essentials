import { truncateCore } from "./truncate-core.js";

export type TruncateOptions = {
	/** Position to truncate the string. Default is "end". */
	position?: "start" | "middle" | "end";

	/**
	 * Whether to cut words when truncating. Default is true.
	 *
	 * If false, the function will try to avoid cutting words by looking for
	 * spaces. If no suitable space is found, it will cut at the maximum length.
	 */
	wordCutting?: boolean;

	/** The string to use as ellipsis. Default is "…". */
	ellipsisString?: string;

	/**
	 * If true, and `maxLength` is less than or equal to the length of
	 * `ellipsisString`, the function will return an empty string. If false, it
	 * will return the non-truncated `ellipsisString`. Default is true.
	 */
	strictLength?: boolean;
};

const CODE_UNIT_MEASURE = (): number => 1;

/**
 * Truncates `text` to at most `maxLength` UTF-16 code units, counting each code
 * unit as one unit of length.
 *
 * This is a simple truncation that does not consider grapheme clusters or wide
 * characters. Use `@ac-kit/format-monospace`'s `truncateToWidth` for truncation
 * based on visible width in monospace fonts.
 *
 * @param text The input string to be truncated.
 * @param maxLength The maximum allowed length of the string including the
 *   ellipsis.
 * @param options Options to customize the ellipsis behavior.
 * @returns The truncated string with ellipsis if needed.
 */
export function truncate(
	text: string,
	maxLength: number,
	options?: TruncateOptions,
): string {
	if (text.length <= maxLength) {
		return text;
	}

	const ellipsisString = options?.ellipsisString ?? "…";

	return truncateCore({
		atoms: text.split(""),
		measure: CODE_UNIT_MEASURE,
		ellipsisString,
		ellipsisMeasure: ellipsisString.length,
		maxMeasure: maxLength,
		position: options?.position ?? "end",
		wordCutting: options?.wordCutting ?? true,
		strictLength: options?.strictLength ?? true,
	});
}
