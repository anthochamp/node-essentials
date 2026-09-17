# @ac-kit/core

## 0.3.0

### Minor Changes

- a5c4d66: **Breaking:** `bigIntToBytesBe` and `bigIntFromBytesBe` move from
  `@ac-kit/math-integer` to `@ac-kit/core`. Update the import specifier; the
  behaviour is unchanged.
  
  They are a wire encoding rather than arithmetic — X.690 §8.3 for an ASN.1
  INTEGER, and what `BigInteger.toByteArray` and `int.to_bytes` produce — and
  their callers need no integer theory at all, while `math-integer` sits too high
  in the dependency graph for some of them to reach it.
  
  New in `@ac-kit/core`: `bigIntToBytesLe` and `bigIntFromBytesLe`, the same
  two's-complement, minimal-or-fixed-width encoding with the least significant
  byte first.
  
  `@ac-kit/format-asn1` no longer depends on `@ac-kit/math-integer`.
- a5c4d66: - **Breaking:** `InetAddress`, `InetEndpoint` and `composeInetAddress` are gone,
    and so are `EPHEMERAL_PORT_MIN_VALUE`, `EPHEMERAL_PORT_MAX_VALUE` and
    `getRandomEphemeralPort`. `core` holds language extensions and wrappers over
    simple Web APIs, and `ARCHITECTURE.md` §3 names IP addressing as the example
    of something pure that is nonetheless domain knowledge. The first three are
    now `@ac-kit/node`'s, where `composeInetAddress` is spelled `toInetAddress`;
    the ephemeral port range is `@ac-kit/net-address`'s, beside the rest of the
    RFC 6335 port semantics. No compatibility re-export is left behind.
  - New `flattenRecord(source, options)` and `unflattenRecord(source, options)`,
    collapsing a nested record to delimiter-joined keys and back. A multi-segment
    path can never reach `__proto__`, `constructor` or `prototype`; a
    single-segment key is a leaf and is kept as one, because a record of
    environment variables should still be able to hold one called `constructor`.
    An array is a leaf value by default rather than being numbered, since an index
    is the one segment a flattened key cannot tell apart from an ordinary key
    spelled `"0"`. A key that itself contains the delimiter is not escaped and the
    delimiter wins on the way back, so the round trip holds exactly for keys that
    do not contain one.
  - New `bytesMap(bytes, map)` and `bytesCombine(a, b, combine)`, applying a
    function to every octet of one array or to every octet pair of two. Both mask
    the callback's result to a single octet, so `~byte` and `left & right` read as
    the bitwise operations they are rather than trailing an `& 0xff` that is easy
    to forget and silent when it is. `bytesCombine` throws on mismatched lengths
    instead of pairing up to the shorter array: a bitwise operation over two
    different widths has no meaning, and truncating to the shorter one turns that
    into a wrong answer rather than an error.
  - New `nextUtf8Boundary(bytes, index)`, the first UTF-8 character boundary at or
    after `index`. Slicing a UTF-8 buffer at an arbitrary offset — a tail, a
    window, a chunk handed to `decodeText` — can land inside a multi-byte
    sequence, whose orphaned tail decodes to a leading U+FFFD; aligning the offset
    forward drops the partial character instead.
  - Five more ASCII predicates: `isAsciiControl`, `isAsciiGraphic`,
    `isAsciiPrintable`, `isAsciiPunctuation` and `isAsciiBlank` — C's `iscntrl`,
    `isgraph`, `isprint`, `ispunct` and `isblank`, joining the `isalpha`/`isdigit`
    family already here. Where `punct` stops and `graph` starts is exactly the kind
    of boundary a hand-written range table gets subtly wrong, and every copy of it
    gets it wrong differently.

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
