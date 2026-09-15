import { isInSortedIntervals } from "@ac-kit/algo";
import { compareNaturalAscending } from "@ac-kit/core";
import { stripAnsiEscapes } from "@ac-kit/format-ansi";

import EAST_ASIAN_WIDE_RANGES from "./_east-asian-width.generated.js";

// oxlint-disable-next-line no-control-regex -- matching C0/C1 control bytes is the point of this pattern
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F]/g;

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
	granularity: "grapheme",
});

/**
 * Splits `text` into user-perceived characters (Unicode grapheme clusters),
 * after stripping control characters (undefined width in any monospace
 * rendering).
 *
 * A cluster groups a base character with its combining marks and ZWJ sequences
 * (flags, multi-part emoji), so those never contribute extra width on top of
 * their base character in {@link visibleWidth}.
 */
export function graphemeSegments(text: string): readonly string[] {
	text = stripAnsiEscapes(text);
	const sanitized = text.replace(CONTROL_CHARACTER_PATTERN, "");
	return Array.from(
		GRAPHEME_SEGMENTER.segment(sanitized),
		(entry) => entry.segment,
	);
}

/**
 * The number of monospace columns `text` occupies once rendered.
 *
 * Control characters contribute 0; each grapheme cluster contributes 1, or 2 if
 * its leading code point is East Asian Wide/Fullwidth (CJK ideographs, most
 * emoji) — unlike counting UTF-16 code units or code points, which under- and
 * over-counts both of those.
 */
export function visibleWidth(text: string): number {
	let width = 0;

	for (const segment of graphemeSegments(text)) {
		const isWide = isInSortedIntervals(
			EAST_ASIAN_WIDE_RANGES,
			segment.codePointAt(0) ?? 0,
			compareNaturalAscending,
		);
		width += isWide ? 2 : 1;
	}

	return width;
}
