---
"@ac-kit/node": minor
---

**Breaking:** `escapeCommandArg` and `escapeCommand` are gone. They dispatched
over `process.platform` to helpers that now live in `@ac-kit/format-shell`, and
`node` may not depend on a `format-*` package (`ARCHITECTURE.md` §3).

Callers name the dialect instead, deriving it from the platform if that is what
they want:

```ts
import { escapeCommandArg, shellDialectForPlatform } from "@ac-kit/format-shell";

escapeCommandArg(value, shellDialectForPlatform(process.platform));
```
