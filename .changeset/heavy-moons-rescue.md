---
"@ac-kit/format-glob": minor
---

The whole bash glob language, a structural no-backtracking guarantee, bounded
compilation, and a segment-oriented face for paths.

A new `"bash"` preset joins the three existing ones and carries what they do
not: `?(a|b)`, `*(a|b)`, `+(a|b)`, `@(a|b)` and `!(a|b)`; a leading `!` that
inverts the whole verdict, distinct from the character-class `!` that was
already there; `#` comments; `[[:alpha:]]` and its eleven siblings; and
`matchBase`, off by default as it is in the language. The parser, the printer
and both matchers handle every one of them, and the preset is pinned against
generated `minimatch` vectors, with the three places the two deliberately differ
named in the documentation.

`!(…)` is what forced the engine question. Until now the package compiled to a
native `RegExp`, and its resistance to catastrophic backtracking came from how
the source was built rather than from the engine running it — careful
construction, which `!(…)` and `*(…)` do not survive. `@ac-kit/format-regex`'s
linear-time matcher is now the correctness baseline, so the guarantee holds for
every dialect. The `RegExp` path stays as an optimisation and is chosen at
compile time, never by the caller, so a `"bash"` pattern like `**/*.ts` keeps it
instead of an entire dialect being sent to the slower engine.

Taking a complement costs exponential time in the worst case, which makes bounds
part of the feature rather than decoration around it. `GlobLimits` bounds the
pattern length, the brace nesting, the brace-expansion _product_
(`{a,b}{a,b}{a,b}` is one level deep and eight alternatives, so depth never
bounded this), the extglob nesting, the range expansion inside an extglob body
and the complement's state count, and carries `format-regex`'s own `RegexLimits`
through to the matcher. `DEFAULT_GLOB_LIMITS` sits high enough that no
hand-written pattern reaches them, `GlobLimitExceededError` names the bound it
hit, and every one is an option so a caller holding a trusted pattern can raise
it. `globLimits` resolves the whole record, including the nested `regex`, and
returns the new `ResolvedGlobLimits`; resolution happens exactly once, at
whichever public entry point the caller reached, so a compiled matcher does no
option handling per match and a path pattern does none per segment.

`compileGlobPath` and `matchGlobPath` take the path and the pattern as arrays of
segments. Joining them would be lossy the moment a segment holds the delimiter,
which is why this is not a separator option: `**` spans zero or more segments,
`*` matches exactly one, and every other segment goes through `compileGlob`
under the dialect. A match reports how it matched — `*`, `**` and in-segment
glob counts, whether the last segment is a wildcard, how many segments there are
— because the real question a configuration overlay asks is which of several
matching patterns wins. `compareGlobPathMatches` answers it, most specific
first, exact per `ARCHITECTURE.md` §1.8.

Breaking changes, all in the type surface:

- `GlobFeatures` gains `extglob`, `patternNegation`, `comments`, `matchBase` and
  `posixClasses`. A caller passing one of the named presets is unaffected; a
  caller building the record itself has five switches to answer. All five are
  `false` in `"posix"`, `"editorconfig"` and `"gitignore"`, so those three
  dialects match exactly what they matched before.
- `GlobPattern` gains `negated` and `comment`, which is where a leading `!` and
  a leading `#` land. `GlobClassItem` gains a `"posix"` variant for
  `[[:alpha:]]`, so an exhaustive `switch` over it needs another arm.
- `GlobSyntaxError` is gone. It was thrown in exactly one place, brace nesting,
  which is now one of six bounds reported as `GlobLimitExceededError` with the
  bound it hit named. Nothing else in the parser ever threw it, because the
  house rule is that a construct the dialect does not define is matched
  literally rather than rejected — an exported error class no code path can
  produce was describing a parser this is not.
- `printGlob` escapes `(`, `)` and `|` in literal text, which it has to:
  `@(a|b)` is a group under `"bash"`, and the printed form is contracted to mean
  the same thing under any dialect. Literal text opening with `!` or `#` is
  escaped for the same reason.

`@ac-kit/algo` is a new dependency: its interval algebra replaced this package's
own character-set operations.
