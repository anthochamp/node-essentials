---
"@ac-kit/core": minor
---

Clarify the object type guards, which were three near-synonyms with one honest
doc comment between them.

`isObject` and `isPojo` keep their names and behaviour and now say which
question each answers, and which sibling answers the other two. In short:
`isObject` asks whether there is a non-array object here at all; `isPojo` asks
whether it is a data bag, following the prototype chain; `hasObjectPrototype`
asks the same of the *own* prototype only, so `Object.create({})` fails it.

**Breaking:** `isPlainObject` is now `hasObjectPrototype`. The old name was a
trap — everywhere else in the ecosystem `isPlainObject` means what this package
calls `isPojo`, so a caller reaching for the familiar name got the strictest
check in the family. It was never exported from the barrel, so this only affects
a deep import.
