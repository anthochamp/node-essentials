# @ac-kit/format-http

HTTP header and trailer fields, as defined by the RFC 9110 field-value grammar.

A header map is not a plain object. One name may carry several values, lookup is
case-insensitive, a long value may be folded across lines, and a few names —
`authorization`, `cookie`, `set-cookie` — must never reach a log in the clear.
`HttpFields` is the container that knows all four rules.

```typescript
import { HttpHeaders } from "@ac-kit/format-http";

const headers = new HttpHeaders({ "Content-Type": "application/json" });
headers.append("set-cookie", "a=1", "b=2");

headers.get("content-type"); // ["application/json"] — case-insensitive
headers.has("Authorization"); // false
String(headers); // sensitive values redacted
```

## What it exposes

- `HttpFields` — the multi-value, case-insensitive field container: `get`,
  `set`, `append`, `delete`, `has`, `clear`, `names`, `foldedEntries`, `filter`,
  plus `isSensitive` and `isUnfoldable`.
- `HttpHeaders` — `HttpFields` with typed accessors for `content-type` and
  `content-disposition`.
- `HttpTrailers` — `HttpFields` for the trailer section.
- `HttpFieldsOptions` — which names count as sensitive, which must not be
  unfolded, the folding spacing, and whether `toString` redacts. Each defaults
  to the common set.

This is the syntax of HTTP only. Anything about a connection, a request/response
exchange or the Fetch API lives in `@ac-kit/net-http`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-http/)
for the full reference.

## Further reading

- [RFC 9110 §5](https://www.rfc-editor.org/rfc/rfc9110#section-5) — the field
  syntax this implements (authoritative).
