# @ac-kit/format-regex

A regex-dialect lexer, parser, printer, and a Thompson-construction / Pike-VM
codec.

```ts
import { compileRegex } from "@ac-kit/format-regex";

const re = compileRegex("(\\d+)-(\\d+)");
re.test("pages 10-20"); // true
re.exec("pages 10-20"); // { index: 6, length: 5, text: "10-20", groups: [...] }
```

Because matching runs on a Pike VM (all threads advance in lockstep, no
backtracking), it is immune to catastrophic ("ReDoS") blowup: `(a+)+b` against a
long non-matching input returns in linear time, where a backtracking engine
(including native `RegExp`) is exponential.

Supported syntax: literals, `.`, `^`/`$` anchors, `[...]`/`[^...]` classes (with
ranges and `\d\w\s\D\W\S` shorthands, also usable outside classes), `(...)`
capturing / `(?:...)` non-capturing groups, `|` alternation, and
`*`/`+`/`?`/`{m}`/`{m,}`/`{m,n}` quantifiers (each optionally lazy via a
trailing `?`). Not supported, rejected with a clear parse error rather than
silently mishandled: lookaround, named groups, backreferences, flags, and
`\p{...}` Unicode property escapes. Matching is by UTF-16 code unit, not full
Unicode code point (no special handling of astral characters). A bare `{` is
always parsed as the start of a quantifier — use `\{` for a literal brace.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-regex/)
for the full reference.
