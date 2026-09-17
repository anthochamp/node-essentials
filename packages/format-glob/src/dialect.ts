/**
 * Which constructs a glob dialect gives meaning to.
 *
 * A construct switched off is **matched literally**, never rejected: that is
 * how EditorConfig and gitignore behave with syntax they do not define, and a
 * pattern file written for one tool must not become an error in another.
 */
export type GlobFeatures = {
	/**
	 * `*` — any run of characters. Always on; {@link starCrossesSeparator} says
	 * how far.
	 */
	readonly starCrossesSeparator: boolean;

	/** `**` — a whole path segment span, including separators. */
	readonly globstar: boolean;

	/** `?` — exactly one character. */
	readonly singleChar: boolean;

	/** `[abc]`, `[a-z]` — a character class. */
	readonly characterClass: boolean;

	/** Which prefix negates a class. Ignored when {@link characterClass} is off. */
	readonly classNegation: "!" | "^" | "both";

	/**
	 * `[[:alpha:]]` — a POSIX class name inside a character class. Ignored when
	 * {@link characterClass} is off.
	 */
	readonly posixClasses: boolean;

	/** `{a,b}` — alternation between literal branches. */
	readonly braceAlternation: boolean;

	/** `{1..9}` — an inclusive integer range. */
	readonly braceRange: boolean;

	/**
	 * `?(a|b)`, `*(a|b)`, `+(a|b)`, `@(a|b)`, `!(a|b)` — the ksh extended glob
	 * groups bash enables with `shopt -s extglob`.
	 */
	readonly extglob: boolean;

	/** `\x` — the next character is literal. */
	readonly backslashEscape: boolean;

	/**
	 * A leading `/` anchors the pattern to the search root rather than matching
	 * at any depth.
	 */
	readonly leadingSlashAnchors: boolean;

	/** A trailing `/` restricts the match to directories. */
	readonly trailingSlashMeansDirectory: boolean;

	/**
	 * A leading `!` inverts the whole pattern's verdict. Repeated `!` toggle, so
	 * `!!a` means `a`. Unrelated to {@link classNegation}, which inverts one
	 * character class and nothing else.
	 */
	readonly patternNegation: boolean;

	/** A leading `#` makes the whole pattern a comment, which matches nothing. */
	readonly comments: boolean;

	/**
	 * A pattern containing no separator is matched against the last path segment
	 * rather than against the whole path.
	 */
	readonly matchBase: boolean;

	/** Whether matching is case sensitive. */
	readonly caseSensitive: boolean;

	/**
	 * Whether a leading `.` must be matched by a literal `.` rather than by a
	 * wildcard — POSIX's hidden-file rule.
	 */
	readonly periodMustBeExplicit: boolean;
};

/**
 * A dialect: either one of the named presets or a full feature record.
 *
 * Presets are the shorthand; the record is what actually drives parsing, so a
 * caller with a variant nobody named can still express it.
 */
export type GlobDialect = GlobDialectName | GlobFeatures;

/** The dialects with a consumer in this repository. */
export type GlobDialectName = "bash" | "editorconfig" | "gitignore" | "posix";

/**
 * Bash glob(3) with `extglob` on — the language `minimatch` implements, and its
 * defaults.
 *
 * The only preset carrying the four bash-only constructs: extended globs, a
 * leading `!` that inverts the verdict, `#` comments, and POSIX class names.
 * Dot-files stay hidden from wildcards, as they are in a shell.
 */
const BASH_: GlobFeatures = {
	starCrossesSeparator: false,
	globstar: true,
	singleChar: true,
	characterClass: true,
	classNegation: "both",
	posixClasses: true,
	braceAlternation: true,
	braceRange: true,
	extglob: true,
	backslashEscape: true,
	leadingSlashAnchors: false,
	trailingSlashMeansDirectory: false,
	patternNegation: true,
	comments: true,
	matchBase: false,
	caseSensitive: true,
	periodMustBeExplicit: true,
};

/**
 * EditorConfig §Wildcard Patterns: braces and ranges, `**` spans separators,
 * `!` negates a class, no anchoring or directory suffix.
 */
const EDITORCONFIG_: GlobFeatures = {
	starCrossesSeparator: false,
	globstar: true,
	singleChar: true,
	characterClass: true,
	classNegation: "!",
	posixClasses: false,
	braceAlternation: true,
	braceRange: true,
	extglob: false,
	backslashEscape: true,
	leadingSlashAnchors: false,
	trailingSlashMeansDirectory: false,
	patternNegation: false,
	comments: false,
	matchBase: false,
	caseSensitive: true,
	periodMustBeExplicit: false,
};

/**
 * Gitignore(5): no brace expansion at all — `{a,b}` is three literal characters
 * plus its contents — but anchoring and the directory suffix carry meaning.
 *
 * `patternNegation` and `comments` stay off. A gitignore file does give `!` and
 * `#` a meaning, but it is a meaning about which _rule in the file_ wins and
 * which lines are read at all, not about whether a path matches a pattern. The
 * consumer reading the file owns that decision, and passes a record with them
 * on when it wants this package to take it instead.
 */
const GITIGNORE_: GlobFeatures = {
	starCrossesSeparator: false,
	globstar: true,
	singleChar: true,
	characterClass: true,
	classNegation: "both",
	posixClasses: false,
	braceAlternation: false,
	braceRange: false,
	extglob: false,
	backslashEscape: true,
	leadingSlashAnchors: true,
	trailingSlashMeansDirectory: true,
	patternNegation: false,
	comments: false,
	matchBase: false,
	caseSensitive: true,
	periodMustBeExplicit: false,
};

/**
 * POSIX glob(7)/fnmatch(3): no `**`, no braces, `^` and `!` both negate a
 * class, and a leading period must be matched explicitly.
 */
const POSIX_: GlobFeatures = {
	starCrossesSeparator: false,
	globstar: false,
	singleChar: true,
	characterClass: true,
	classNegation: "both",
	posixClasses: false,
	braceAlternation: false,
	braceRange: false,
	extglob: false,
	backslashEscape: true,
	leadingSlashAnchors: false,
	trailingSlashMeansDirectory: false,
	patternNegation: false,
	comments: false,
	matchBase: false,
	caseSensitive: true,
	periodMustBeExplicit: true,
};

const PRESETS_: Record<GlobDialectName, GlobFeatures> = {
	bash: BASH_,
	editorconfig: EDITORCONFIG_,
	gitignore: GITIGNORE_,
	posix: POSIX_,
};

/** Resolves a dialect to the feature record that drives parsing. */
export function globFeatures(dialect: GlobDialect = "posix"): GlobFeatures {
	return typeof dialect === "string" ? PRESETS_[dialect] : dialect;
}
