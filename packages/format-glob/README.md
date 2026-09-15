# @ac-kit/format-glob

Glob patterns: parse, print, and match — with the dialect as a parameter.

There is no single glob language. EditorConfig defines `{a,b}` and `{1..9}`;
gitignore does not, and treats those characters literally. POSIX `fnmatch` has
no `**` at all but does hide dot-files from wildcards. This package takes the
dialect as a record of feature switches, with named presets over it, so each
consumer gets the language its own file format actually specifies.

```ts
import { compileGlob, matchGlob } from "@ac-kit/format-glob";

matchGlob("src/main.ts", "**/*.{ts,tsx}", "editorconfig"); // true
matchGlob("src/main.ts", "**/*.{ts,tsx}", "gitignore"); // false — braces are literal there

const isTest = compileGlob("**/*.test.ts", "editorconfig");
isTest("packages/core/src/x.test.ts"); // true
```

## Dialects

`"posix"` (the default), `"editorconfig"` and `"gitignore"` are the named
presets. Pass a `GlobFeatures` record instead to describe a variant none of them
covers.

**A construct the dialect does not define is matched literally, never
rejected.** A pattern file written for one tool degrades to an exact match in
another rather than becoming an error.

## Matching

`compileGlob` returns a matcher backed by a native `RegExp`. The pattern is
fully anchored, and consecutive `**` runs are collapsed so that no two unbounded
quantifiers ever sit side by side — that adjacency is what makes a naive
glob-to-regex translation backtrack exponentially, and it matters because
patterns come from configuration files rather than from the program.

Numeric ranges are the one construct a regular expression cannot express. They
are captured and range-checked after the match rather than expanded into an
alternation, so `{1..1000000}` compiles to the same size as `{1..9}`.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-glob/)
for the full reference.
