---
"@ac-kit/core": minor
---

Add `nullIfEmpty`, normalizing an object with no own enumerable property to
`null`. Useful against APIs that report "no value" as an empty object, so that
callers only have one absent form to test.
