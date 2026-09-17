/** A node in a parsed glob pattern. */
export type GlobNode =
	| { readonly kind: "literal"; readonly text: string }
	| { readonly kind: "any-char" }
	| { readonly kind: "star" }
	| { readonly kind: "globstar" }
	| { readonly kind: "separator" }
	| {
			readonly kind: "class";
			readonly negated: boolean;
			readonly items: readonly GlobClassItem[];
	  }
	| { readonly kind: "alternation"; readonly branches: readonly GlobNode[][] }
	| { readonly kind: "range"; readonly from: number; readonly to: number }
	| {
			readonly kind: "extglob";
			readonly operator: GlobExtglobOperator;
			readonly branches: readonly GlobNode[][];
	  };

/**
 * Which repetition an extglob group takes, spelled as the character that
 * introduces it: `?(a|b)` zero or one, `*(a|b)` zero or more, `+(a|b)` one or
 * more, `@(a|b)` exactly one, `!(a|b)` anything the branches do not match.
 */
export type GlobExtglobOperator = "?" | "*" | "+" | "@" | "!";

/**
 * One member of a character class: a single character, an inclusive span, or a
 * POSIX class name.
 */
export type GlobClassItem =
	| { readonly kind: "char"; readonly char: string }
	| { readonly kind: "span"; readonly from: string; readonly to: string }
	| { readonly kind: "posix"; readonly name: GlobPosixClassName };

/**
 * A POSIX character class, spelled without its `[:` `:]` delimiters.
 *
 * Interpreted in the C locale, the way glob(7) and fnmatch(3) specify them, so
 * `[[:alpha:]]` is `A-Za-z` rather than every Unicode letter.
 */
export type GlobPosixClassName =
	| "alnum"
	| "alpha"
	| "blank"
	| "cntrl"
	| "digit"
	| "graph"
	| "lower"
	| "print"
	| "punct"
	| "space"
	| "upper"
	| "xdigit";

/** A parsed glob pattern, with the dialect-level decisions already resolved. */
export type GlobPattern = {
	readonly nodes: readonly GlobNode[];

	/** Set when a leading `/` anchored the pattern in a dialect that allows it. */
	readonly anchored: boolean;

	/** Set when a trailing `/` restricted it to directories. */
	readonly directoryOnly: boolean;

	/**
	 * Set when a leading `!` negated the whole pattern in a dialect that allows
	 * it. Distinct from a class negation, which inverts one `[…]` and nothing
	 * else.
	 */
	readonly negated: boolean;

	/**
	 * The text after a leading `#` in a dialect that gives comments meaning, or
	 * `null` when the pattern is not one. A comment matches nothing, and
	 * {@link GlobPattern.nodes} is empty.
	 */
	readonly comment: string | null;
};
