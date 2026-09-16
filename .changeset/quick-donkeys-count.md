---
"@ac-kit/core": minor
---

Add `parseNumberOrBigInt`, which reads a numeric literal out of text and widens
to `bigint` rather than rounding, and `bigIntIsSafeNumber`, the range test it
and `jsonMakeBigIntReplacerFunction` share.

```ts
parseNumberOrBigInt("42"); // 42
parseNumberOrBigInt("9007199254740993"); // 9007199254740993n
parseNumberOrBigInt("abc"); // null
```

Reach for it where a human wrote the value — an environment variable, a config
field, a CLI argument. `bigIntParse` remains the right call when the value must
be an integer or the radix is known and not spelled in the text; it reports a
malformed input by throwing rather than by returning `null`.
