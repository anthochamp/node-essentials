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
	| { readonly kind: "range"; readonly from: number; readonly to: number };

/** One member of a character class: a single character or an inclusive span. */
export type GlobClassItem =
	| { readonly kind: "char"; readonly char: string }
	| { readonly kind: "span"; readonly from: string; readonly to: string };

/** A parsed glob pattern, with the dialect-level decisions already resolved. */
export type GlobPattern = {
	readonly nodes: readonly GlobNode[];

	/** Set when a leading `/` anchored the pattern in a dialect that allows it. */
	readonly anchored: boolean;

	/** Set when a trailing `/` restricted it to directories. */
	readonly directoryOnly: boolean;
};
