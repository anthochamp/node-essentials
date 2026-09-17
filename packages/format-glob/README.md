# @ac-kit/format-glob

Glob patterns: parse, print, and match — with the dialect as a parameter.

There is no single glob language. EditorConfig defines `{a,b}` and `{1..9}`;
gitignore does not, and treats those characters literally. POSIX `fnmatch` has
no `**` at all but does hide dot-files from wildcards. bash adds `!(a|b)` on top
of all of it. This package takes the dialect as a record of feature switches,
with named presets over it, so each consumer gets the language its own file
format actually specifies.

```ts
import { compileGlob, matchGlob } from "@ac-kit/format-glob";

matchGlob("src/main.ts", "**/*.{ts,tsx}", "editorconfig"); // true
matchGlob("src/main.ts", "**/*.{ts,tsx}", "gitignore"); // false — braces are literal there
matchGlob("main.spec.ts", "!(*.spec).ts", "bash"); // false — a complement

const isTest = compileGlob("**/*.test.ts", "editorconfig");
isTest("packages/core/src/x.test.ts"); // true
```

## Dialects

`"posix"` (the default), `"bash"`, `"editorconfig"` and `"gitignore"` are the
named presets. Pass a `GlobFeatures` record instead to describe a variant none
of them covers.

**A construct the dialect does not define is matched literally, never
rejected.** A pattern file written for one tool degrades to an exact match in
another rather than becoming an error.

`"bash"` is the full language: extended globs (`?(a|b)`, `*(a|b)`, `+(a|b)`,
`@(a|b)`, `!(a|b)`), a leading `!` that inverts the whole verdict, `#` comments,
and POSIX class names (`[[:alpha:]]`, `[[:digit:]]`, …). The other three presets
leave all four literal, which is what each of those formats specifies. A
gitignore file does give `!` and `#` a meaning, but it is a meaning about which
_rule in the file_ wins and which lines are read at all — the consumer reading
the file owns that decision rather than the matcher. Turn any of them on with a
record when you want the opposite.

`matchBase` — a separator-free pattern matched against the last path segment —
is off everywhere and available the same way.

### Against `minimatch`

`"bash"` reproduces `minimatch`'s defaults, and a test in this package pins the
two together against generated vectors. Three deliberate differences, each
pinned by that same test:

- A leading `!(` is the complement group, not negation of a literal `(`.
  `minimatch` strips every leading `!` before looking at what follows; bash does
  not, and this preset is named for the language.
- `.` and `..` are ordinary strings. `minimatch` refuses to let a wildcard match
  either; `echo .*` in a shell lists both.
- `*` matches the empty string. `minimatch` treats a path portion as never
  empty, because a filename never is; this package matches strings, and its
  other three dialects already answer this way.

## Matching

`compileGlob` returns a `GlobMatcher` whatever the pattern, but two engines sit
behind it and **which one runs is decided at compile time, never by the
caller**.

`@ac-kit/format-regex`'s Pike VM is the correctness baseline. It backtracks over
nothing, so its linear-time property belongs to the engine rather than to the
translation, and it holds for every construct — including `!(…)`, which is a
genuine complement: the body is determinised and its accepting states swapped,
because `format-regex` has no lookaround to approximate one with.

A native `RegExp` is the fast path, and it is safe only because of how its
source is built: fully anchored, consecutive `**` runs collapsed so no two
unbounded quantifiers sit side by side, and no repetition nested inside another.
That is the reasoning a pattern out of a configuration file could break, so the
fast path is taken only when the parsed pattern provably holds none of `!(…)`,
`*(…)` or `+(…)`. The dialect answers first and cheaply — one without `extglob`
cannot produce any of them — and the parsed tree answers precisely, which is
what keeps almost every real `"bash"` pattern on the fast path instead of
sending a whole dialect to the VM.

The two backends are checked against each other over a corpus of patterns ×
inputs × dialects, so the choice is unobservable except by timing.

Numeric ranges are the one construct neither engine expresses directly. They are
captured and range-checked after the match rather than expanded into an
alternation, so `{1..1000000}` compiles to the same size as `{1..9}`. Inside an
extglob body they _are_ expanded, bounded by `maxRangeExpansion`: a complement
is taken over a language, and a capture is not one.

## Limits

A glob arrives from a configuration file, a command line or a remote document,
so its cost is not the author's to bound. `GlobLimits` bounds it, with
`DEFAULT_GLOB_LIMITS` set high enough that no hand-written pattern reaches them:

```ts
import { compileGlob } from "@ac-kit/format-glob";

compileGlob("!(*a*b*c*d*e*f*)", "bash", { maxComplementStates: 32 });
// GlobLimitExceededError: Complementing an extglob needs more than 32 states
```

`maxPatternLength`, `maxBraceDepth`, `maxBraceProduct` (the combinatorial size,
not the nesting — `{a,b}{a,b}{a,b}` is one level deep and eight alternatives),
`maxExtglobDepth`, `maxRangeExpansion` and `maxComplementStates`, plus a `regex`
field carrying `format-regex`'s own `RegexLimits` through to the VM backend.
Exceeding any of them throws `GlobLimitExceededError`, which names the bound it
hit. All are options rather than constants, so a caller holding a trusted
pattern can raise them.

`maxComplementStates` is the one that matters most: complementing means
determinising, subset construction is exponential in the worst case, and
`!(*a*b*c*…)` is that case exactly.

## Paths as segments

A caller that already holds a path as segments should not have to join it:
joining is lossy the moment a segment may itself contain the delimiter, and a
separator that cannot appear in one is not always available.
`compileGlobPath` takes both sides as arrays.

```ts
import { compileGlobPath } from "@ac-kit/format-glob";

const matcher = compileGlobPath(["foo", "**", "bar_*"]);
matcher(["foo", "qux", "bar_baz"]); // a GlobPathMatch
matcher(["foo", "qux"]); // null
```

`**` as a whole segment spans zero or more segments and `*` matches exactly one;
every other segment is compiled with `compileGlob` under the dialect, so the
`/`-shaped constructs inside one segment never come up and no separator option
is needed. Matching is O(path segments × pattern segments), carrying the set of
reachable pattern positions forward rather than backtracking.

A match reports how the pattern matched — how many `*`, `**` and in-segment glob
segments it held, whether its last segment is a wildcard, and how long it is —
because the question a configuration overlay actually asks is _which_ of several
matching patterns wins. `compareGlobPathMatches` is that ranking, most specific
first, and an exact strict weak ordering so it is safe to sort with.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-glob/)
for the full reference.
