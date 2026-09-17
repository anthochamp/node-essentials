import { compileGlobBounded, type GlobMatcher } from "./_compile-glob.js";
import { parseGlobBounded } from "./_parse-glob.js";
import type { GlobPattern } from "./ast.js";
import { type GlobDialect, globFeatures } from "./dialect.js";
import { type GlobLimits, globLimits } from "./limits.js";

/** The pattern segment spanning zero or more path segments. */
const GLOBSTAR_SEGMENT_ = "**";

/** The pattern segment matching exactly one path segment. */
const WILDCARD_SEGMENT_ = "*";

/**
 * How a path matched a pattern, in the terms a precedence ranking needs.
 *
 * Every field is a property of the pattern rather than of the path, because a
 * successful match visits each pattern segment exactly once — which is what
 * makes {@link compareGlobPathMatches} a ranking of patterns rather than of
 * matches that happen to share one.
 */
export type GlobPathMatch = {
	/** How many `*` segments the pattern holds. */
	readonly wildcardSegments: number;

	/** How many `**` segments the pattern holds. */
	readonly globstarSegments: number;

	/**
	 * How many segments needed the glob dialect — neither `*` nor `**`, and not
	 * plain text either.
	 */
	readonly globSegments: number;

	/** Whether the pattern's last segment is `*` or `**`. */
	readonly rightmostWildcard: boolean;

	/** How many segments the pattern holds. */
	readonly patternLength: number;
};

/** Tests a path, given as segments, against a compiled pattern. */
export type GlobPathMatcher = (
	pathSegments: readonly string[],
) => GlobPathMatch | null;

type SegmentStep =
	| { readonly kind: "globstar" }
	| { readonly kind: "wildcard" }
	| { readonly kind: "match"; readonly matcher: GlobMatcher };

/**
 * Compiles a pattern given as path segments.
 *
 * Segments rather than a joined string, and no separator option: joining is
 * lossy the moment a segment may itself contain the delimiter, and a caller
 * that already holds the segments should never have to pick a character that
 * cannot appear in them. `**` spans zero or more segments and `*` matches
 * exactly one; every other segment is compiled with {@link compileGlob} under
 * `dialect`, so the `/`-shaped constructs inside one segment simply never come
 * up.
 *
 * Matching is O(path segments × pattern segments) segment tests, with no
 * backtracking: the matcher carries the set of reachable pattern positions
 * forward one path segment at a time.
 *
 * `dialect` and `limits` are resolved once for the whole pattern rather than
 * once per segment, so a ten-segment pattern costs one resolution and not ten.
 */
export function compileGlobPath(
	patternSegments: readonly string[],
	dialect: GlobDialect = "posix",
	limits?: GlobLimits,
): GlobPathMatcher {
	const features = globFeatures(dialect);
	const bounds = globLimits(limits);

	let globSegments = 0;
	let wildcardSegments = 0;
	let globstarSegments = 0;

	const steps: SegmentStep[] = patternSegments.map((segment) => {
		if (segment === GLOBSTAR_SEGMENT_) {
			globstarSegments += 1;
			return { kind: "globstar" };
		}
		if (segment === WILDCARD_SEGMENT_) {
			wildcardSegments += 1;
			return { kind: "wildcard" };
		}
		const parsed = parseGlobBounded(segment, features, bounds);
		if (!isPlainText(parsed)) {
			globSegments += 1;
		}
		return {
			kind: "match",
			matcher: compileGlobBounded(parsed, features, bounds),
		};
	});

	const last = patternSegments.at(-1);
	const statistics: GlobPathMatch = {
		wildcardSegments,
		globstarSegments,
		globSegments,
		rightmostWildcard: last === WILDCARD_SEGMENT_ || last === GLOBSTAR_SEGMENT_,
		patternLength: patternSegments.length,
	};
	const length = steps.length;

	return (pathSegments) => {
		let reachable = new Set<number>();
		advance(reachable, 0, steps);

		for (const pathSegment of pathSegments) {
			const next = new Set<number>();
			for (const position of reachable) {
				const step = steps[position];
				if (step === undefined) {
					continue;
				}
				if (step.kind === "globstar") {
					// `**` consumes this segment and stays where it is; the zero-segment
					// case was already added when the position was reached.
					advance(next, position, steps);
					continue;
				}
				if (step.kind === "wildcard" || step.matcher(pathSegment)) {
					advance(next, position + 1, steps);
				}
			}
			reachable = next;
			if (reachable.size === 0) {
				return null;
			}
		}

		return reachable.has(length) ? statistics : null;
	};
}

/** Adds `position` and every position a `**` run can skip past from there. */
function advance(
	reachable: Set<number>,
	position: number,
	steps: readonly SegmentStep[],
): void {
	let cursor = position;
	while (!reachable.has(cursor)) {
		reachable.add(cursor);
		if (steps[cursor]?.kind !== "globstar") {
			return;
		}
		cursor += 1;
	}
}

/**
 * Whether a segment carries no glob meaning under the dialect it was parsed
 * with.
 *
 * Asked of the parsed form rather than by looking for `*` and `[` in the text,
 * so `a\*b` counts as plain and `{a,b}` counts as plain under a dialect with no
 * braces — which is the whole point of the dialect being a parameter.
 */
function isPlainText(parsed: GlobPattern): boolean {
	return (
		!parsed.anchored &&
		!parsed.directoryOnly &&
		!parsed.negated &&
		parsed.comment === null &&
		parsed.nodes.every((node) => node.kind === "literal")
	);
}

/**
 * Tests one path against one pattern, both given as segments.
 *
 * A utility over {@link compileGlobPath}; compile once and reuse the matcher
 * when testing many paths against the same pattern.
 */
export function matchGlobPath(
	pathSegments: readonly string[],
	patternSegments: readonly string[],
	dialect: GlobDialect = "posix",
	limits?: GlobLimits,
): GlobPathMatch | null {
	return compileGlobPath(patternSegments, dialect, limits)(pathSegments);
}

/**
 * Which of two matching patterns is the more specific, most specific first.
 *
 * An exact strict weak ordering — no tolerance and no "close enough" tier — so
 * it is safe to sort, bisect or heap with. The ranking every configuration
 * overlay ends up needing:
 *
 * 1. By kind: exact text, then in-segment globs, then `*`, then `**`, then any
 *    mixture of those, which is the least specific thing a pattern can be;
 * 2. Between two patterns holding a single `*` and nothing else, the one whose `*`
 *    is rightmost — a trailing wildcard constrains more of the path;
 * 3. Fewer special segments;
 * 4. More segments, since each one is another constraint;
 * 5. Fewer `**`.
 *
 * Two patterns that tie on all five are genuinely equivalent for precedence,
 * and the caller's own order decides between them.
 */
export function compareGlobPathMatches(
	left: GlobPathMatch,
	right: GlobPathMatch,
): number {
	const leftKind = specificityKind(left);
	const rightKind = specificityKind(right);
	if (leftKind !== rightKind) {
		return leftKind - rightKind;
	}

	if (isLoneWildcard(left) && isLoneWildcard(right)) {
		if (left.rightmostWildcard !== right.rightmostWildcard) {
			return left.rightmostWildcard ? -1 : 1;
		}
	}

	const leftSpecial = specialCount(left);
	const rightSpecial = specialCount(right);
	if (leftSpecial !== rightSpecial) {
		return leftSpecial - rightSpecial;
	}

	if (left.patternLength !== right.patternLength) {
		return right.patternLength - left.patternLength;
	}

	return left.globstarSegments - right.globstarSegments;
}

function specialCount(match: GlobPathMatch): number {
	return match.wildcardSegments + match.globstarSegments + match.globSegments;
}

function isLoneWildcard(match: GlobPathMatch): boolean {
	return (
		match.wildcardSegments === 1 &&
		match.globstarSegments === 0 &&
		match.globSegments === 0
	);
}

/** 0 exact, 1 in-segment glob, 2 `*`, 3 `**`, 4 a mixture. */
function specificityKind(match: GlobPathMatch): number {
	const kinds =
		(match.globSegments > 0 ? 1 : 0) +
		(match.wildcardSegments > 0 ? 1 : 0) +
		(match.globstarSegments > 0 ? 1 : 0);
	if (kinds === 0) {
		return 0;
	}
	if (kinds > 1) {
		return 4;
	}
	if (match.globSegments > 0) {
		return 1;
	}
	return match.wildcardSegments > 0 ? 2 : 3;
}
