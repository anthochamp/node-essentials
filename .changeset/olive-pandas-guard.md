---
"@ac-kit/core": minor
---

Harden every object helper that writes a key it did not choose, and export the
two primitives the rest of the tree now uses.

- `setRecordEntry(record, key, value)` — assigns through `Object.defineProperty`
  for `__proto__` and by plain assignment for everything else, so a record built
  from parsed text can hold any key without reaching the prototype setter. The
  record stays an ordinary object: same prototype, same spread, same
  `deepEqual`.
- `isUnsafeRecordKey(key)` — true for `__proto__`, `constructor` and
  `prototype`. A path walk needs this rather than `setRecordEntry`, because
  stepping through `constructor` and then `prototype` pollutes on the *reads*,
  before any assignment happens.

**Breaking:**

- `merge`, `mergeAll`, `mergeInplace`, `mergeAllInplace` and `defaults` now read
  a source's **own** enumerable keys only. `for...in` previously walked the
  source's prototype chain, which both leaked inherited properties into the
  result and let `{"__proto__": …}` from `JSON.parse` replace `Object.prototype`.
- `setAtPath` refuses a path containing `__proto__`, `constructor` or
  `prototype` and writes nothing, silently — the same way it already refused a
  non-numeric index into an array. `getAtPath` is deliberately unchanged:
  reading one of those hands back a prototype the caller could already reach
  through any object it holds.
