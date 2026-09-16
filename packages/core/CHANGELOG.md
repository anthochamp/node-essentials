# @ac-kit/core

## 0.2.0

### Minor Changes

- a493b4a: Clarify the object type guards, which were three near-synonyms with one honest
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
- a493b4a: **Breaking:** the shell quoting and environment variable helpers have moved to
  the new `@ac-kit/format-shell`.
  
  Moved as-is: `escapePosixShSqe`, `escapePosixShCommandArg`,
  `escapePosixShCommand`, `escapeWin32CmdCommandArg`, `escapeWin32CmdCommand`.
  
  Moved and reshaped — see the `@ac-kit/format-shell` entry for why:
  `stringifyEnvVariable` is `printEnvAssignment`, `stringifyEnvVariableValue` is
  `printEnvValue`, `stringifyEnvVariableBoolValue` is `printEnvBoolValue`,
  `parseEnvVariable` is `parseEnvAssignment`, and `parseEnvVariableValueAsBool`
  and `parseEnvVariableValueAsNumber` drop `Variable` from their names.
  `parseEnvVariableValue` and `parseEnvVariableValueAsString` are gone: parsing no
  longer guesses a type, so `FOO=42` reads as `"42"` rather than `42`.
- a493b4a: Harden every object helper that writes a key it did not choose, and export the
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
- 2ab5593: Add `nullIfEmpty`, normalizing an object with no own enumerable property to
  `null`. Useful against APIs that report "no value" as an empty object, so that
  callers only have one absent form to test.
- a493b4a: Add `parseNumberOrBigInt`, which reads a numeric literal out of text and widens
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
