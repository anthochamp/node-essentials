---
"@ac-kit/format-ini": minor
---

Fix two defects in how a parsed key is written onto the result object.

- A key named `constructor`, `toString` or any other `Object.prototype` member
  was treated as a repeat of an earlier occurrence, because the duplicate check
  used `key in target`. Under the default `"last"` policy the first occurrence
  was dropped; under `"array"` it threw `TypeError`. The check now asks for an
  own property.
- `__proto__`, as a key or as a section name, reached the prototype setter
  instead of becoming an entry. It is now stored like any other key, and the
  returned object's prototype is untouched.
