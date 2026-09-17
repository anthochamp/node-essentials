import {
	DEFAULT_REGEX_LIMITS,
	type RegexLimits,
	regexLimits,
} from "@ac-kit/format-regex";

/**
 * Bounds on what a pattern may cost to parse, to compile and to run.
 *
 * A glob arrives from a configuration file, a command line or a remote
 * document, so its size is the caller's problem and not the author's. Every
 * bound here guards a different multiplier: the source text, the combinatorial
 * expansion braces perform on it, the nesting an extglob adds, and the state
 * count complementing `!(…)` reaches. The {@link RegexLimits} passed through to
 * `@ac-kit/format-regex` then bound the compiled program and the run.
 */
export type GlobLimits = {
	/**
	 * Longest pattern accepted, in characters.
	 *
	 * Checked before anything is parsed, so every other bound applies to an
	 * already-bounded input.
	 */
	readonly maxPatternLength?: number;

	/** Deepest brace nesting accepted. Real patterns nest one or two deep. */
	readonly maxBraceDepth?: number;

	/**
	 * Most alternatives brace expansion may produce.
	 *
	 * The combinatorial size, not the nesting: `{a,b}{a,b}{a,b}` is three levels
	 * of one branch each and eight alternatives, so depth alone does not bound
	 * it. Computed over the parsed tree in O(nodes).
	 */
	readonly maxBraceProduct?: number;

	/** Deepest extglob nesting accepted — `!(a|@(b|c))` is two. */
	readonly maxExtglobDepth?: number;

	/**
	 * Most values a numeric range inside an extglob body may expand to.
	 *
	 * Only reached there: outside an extglob a range is matched by capturing the
	 * digits and checking the bound afterwards, which costs the same whatever the
	 * bound is. Inside one it has to become real alternatives, because a
	 * complement is taken over a language rather than over a capture.
	 */
	readonly maxRangeExpansion?: number;

	/**
	 * Most states the determinised automaton behind one `!(…)` may hold.
	 *
	 * Complementing a regular language means determinising it first, and subset
	 * construction is exponential in the worst case — `!(*a*b*c*…)` is that case.
	 * This is the bound that makes `!(…)` safe to compile at all.
	 */
	readonly maxComplementStates?: number;

	/** Passed to `@ac-kit/format-regex` on the Pike-VM backend. */
	readonly regex?: RegexLimits;
};

/**
 * Every bound in {@link GlobLimits}, filled in — what {@link globLimits} produces
 * and what the stages behind a public entry point are handed.
 */
export type ResolvedGlobLimits = Required<Omit<GlobLimits, "regex">> & {
	readonly regex: Required<RegexLimits>;
};

/**
 * The bounds parsing reads. Nothing here survives into a matcher, so a matcher
 * never carries them.
 */
export type GlobParseBounds = Pick<
	ResolvedGlobLimits,
	"maxPatternLength" | "maxBraceDepth" | "maxBraceProduct" | "maxExtglobDepth"
>;

/**
 * The bounds the Pike-VM backend reads — the two it enforces while building the
 * automaton, and the pair it hands to `@ac-kit/format-regex`.
 */
export type GlobCompileBounds = Pick<
	ResolvedGlobLimits,
	"maxRangeExpansion" | "maxComplementStates" | "regex"
>;

/**
 * Defaults, chosen so no hand-written pattern reaches them: 4 Ki characters is
 * two orders of magnitude above the longest glob anyone writes by hand, 4 Ki
 * brace alternatives cover `{a,b,c}` nested four deep, and 4 Ki complement
 * states cover every `!(…)` whose body is not itself adversarial.
 */
export const DEFAULT_GLOB_LIMITS: ResolvedGlobLimits = {
	maxPatternLength: 4096,
	maxBraceDepth: 10,
	maxBraceProduct: 4096,
	maxExtglobDepth: 10,
	maxRangeExpansion: 1024,
	maxComplementStates: 4096,
	regex: DEFAULT_REGEX_LIMITS,
};

/** Which bound a {@link GlobLimitExceededError} reports. */
export type GlobLimitKind =
	| "patternLength"
	| "braceDepth"
	| "braceProduct"
	| "extglobDepth"
	| "rangeExpansion"
	| "complementStates";

const MESSAGES_: Readonly<Record<GlobLimitKind, (limit: number) => string>> = {
	patternLength: (limit) => `Glob pattern is longer than ${limit} characters`,
	braceDepth: (limit) => `Brace nesting deeper than ${limit}`,
	braceProduct: (limit) => `Brace expansion exceeds ${limit} alternatives`,
	extglobDepth: (limit) => `Extglob nesting deeper than ${limit}`,
	rangeExpansion: (limit) =>
		`Numeric range inside an extglob expands past ${limit} values`,
	complementStates: (limit) =>
		`Complementing an extglob needs more than ${limit} states`,
};

/** Thrown when a pattern exceeds one of the {@link GlobLimits}. */
export class GlobLimitExceededError extends Error {
	constructor(
		readonly kind: GlobLimitKind,
		readonly limit: number,
	) {
		super(MESSAGES_[kind](limit));
		this.name = "GlobLimitExceededError";
	}
}

/**
 * Fills in the unset bounds from {@link DEFAULT_GLOB_LIMITS}, including the
 * nested `@ac-kit/format-regex` pair.
 *
 * Every public entry point calls this exactly once and hands the result down,
 * so no bound is resolved again per compile and none at all per match.
 */
export function globLimits(limits?: GlobLimits): ResolvedGlobLimits {
	return {
		maxPatternLength:
			limits?.maxPatternLength ?? DEFAULT_GLOB_LIMITS.maxPatternLength,
		maxBraceDepth: limits?.maxBraceDepth ?? DEFAULT_GLOB_LIMITS.maxBraceDepth,
		maxBraceProduct:
			limits?.maxBraceProduct ?? DEFAULT_GLOB_LIMITS.maxBraceProduct,
		maxExtglobDepth:
			limits?.maxExtglobDepth ?? DEFAULT_GLOB_LIMITS.maxExtglobDepth,
		maxRangeExpansion:
			limits?.maxRangeExpansion ?? DEFAULT_GLOB_LIMITS.maxRangeExpansion,
		maxComplementStates:
			limits?.maxComplementStates ?? DEFAULT_GLOB_LIMITS.maxComplementStates,
		regex: regexLimits(limits?.regex),
	};
}
