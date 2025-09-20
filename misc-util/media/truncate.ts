import { defaults } from "../object/defaults.js";

export type TruncateOptions = {
	/**
	 * Position to truncate the string.
	 * Default is "end".
	 */
	position?: "start" | "middle" | "end";

	/**
	 * Whether to cut words when truncating.
	 * Default is true.
	 *
	 * If false, the function will try to avoid cutting words by looking for spaces.
	 * If no suitable space is found, it will cut at the maximum length.
	 */
	wordCutting?: boolean;

	/**
	 * The string to use as ellipsis.
	 * Default is "…".
	 */
	ellipsisString?: string;

	/**
	 * If true, and `maxLength` is less than or equal to the length of `ellipsisString`,
	 * the function will return an empty string. If false, it will return the
	 * non-truncated `ellipsisString`.
	 * Default is false.
	 */
	strictLength?: boolean;
};

const TRUNCATE_DEFAULT_OPTIONS: Required<TruncateOptions> = {
	position: "end",
	wordCutting: true,
	ellipsisString: "…",
	strictLength: true,
};

/**
 * Truncates a string and adds an ellipsis at the specified position if it exceeds the maximum length.
 *
 * @param text The input string to be truncated.
 * @param maxLength The maximum allowed length of the string including the ellipsis.
 * @param options Options to customize the ellipsis behavior.
 * @returns The truncated string with ellipsis if needed.
 */
export function truncate(
	text: string,
	maxLength: number,
	options?: TruncateOptions,
): string {
	const effectiveOptions = defaults(options, TRUNCATE_DEFAULT_OPTIONS);

	if (text.length <= maxLength) {
		return text;
	}

	const ellipsisStr = effectiveOptions.ellipsisString;
	const ellipsisStrLen = ellipsisStr.length;

	if (maxLength === ellipsisStrLen) {
		return ellipsisStr;
	}

	if (maxLength < ellipsisStrLen) {
		return effectiveOptions.strictLength ? "" : ellipsisStr;
	}

	const targetTextLen = maxLength - ellipsisStrLen;

	switch (effectiveOptions.position) {
		case "start": {
			if (effectiveOptions.wordCutting) {
				return ellipsisStr + text.slice(-targetTextLen);
			} else {
				const slicedText = text.slice(-targetTextLen);
				const firstSpaceIdx = slicedText.indexOf(" ");
				if (firstSpaceIdx === -1) {
					return ellipsisStr + slicedText;
				} else {
					return ellipsisStr + slicedText.slice(firstSpaceIdx + 1);
				}
			}
		}

		case "middle": {
			const leftTextLen = Math.ceil(targetTextLen / 2);
			const rightTextLen = Math.floor(targetTextLen / 2);

			if (effectiveOptions.wordCutting) {
				return (
					text.slice(0, leftTextLen) + ellipsisStr + text.slice(-rightTextLen)
				);
			} else {
				const leftSlicedText = text.slice(0, leftTextLen);
				const rightSlicedText = text.slice(-rightTextLen);

				const lastLeftSpaceIdx = leftSlicedText.lastIndexOf(" ");
				const firstRightSpaceIdx = rightSlicedText.indexOf(" ");

				const leftPart =
					lastLeftSpaceIdx === -1
						? leftSlicedText
						: leftSlicedText.slice(0, lastLeftSpaceIdx);
				const rightPart =
					firstRightSpaceIdx === -1
						? rightSlicedText
						: rightSlicedText.slice(firstRightSpaceIdx + 1);

				return leftPart + ellipsisStr + rightPart;
			}
		}

		case "end": {
			if (effectiveOptions.wordCutting) {
				return text.slice(0, targetTextLen) + ellipsisStr;
			} else {
				const slicedText = text.slice(0, targetTextLen);
				const lastSpaceIdx = slicedText.lastIndexOf(" ");
				if (lastSpaceIdx === -1) {
					return slicedText + ellipsisStr;
				} else {
					return slicedText.slice(0, lastSpaceIdx) + ellipsisStr;
				}
			}
		}
	}
}
