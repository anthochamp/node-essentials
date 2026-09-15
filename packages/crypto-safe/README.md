# @ac-kit/crypto-safe

Constant-time primitives — operations whose runtime does not depend on secret
data.

Comparing two secrets with `===` or a loop that stops at the first difference
leaks how many leading bytes matched. An attacker who can time the comparison
recovers the secret one byte at a time, without ever guessing the whole of it.
These primitives always do the same work, whatever the inputs.

```typescript
import { constantTimeBytesIsEqual } from "@ac-kit/crypto-safe";

// Takes the same time whether the first byte differs or only the last does.
if (!constantTimeBytesIsEqual(receivedTag, expectedTag)) {
  throw new Error("bad signature");
}
```

Two layers. The comparison and selection primitives
(`constantTimeBytesIsEqual`, `constantTimeSelect`) work over `Uint8Array`s and
are what most callers need. Above them sits a fixed-width, limb-array modular
arithmetic kernel — Montgomery multiplication, a swap-based Montgomery ladder
for modular exponentiation, and Barrett reduction — for RSA- and EC-scale
arithmetic where an operand is secret.

Ordinary arithmetic does not belong here. A `bigint` is variable-time by
specification, so it is unusable once a value stops being public; conversely
nothing in this package competes with `@ac-kit/math-numbers` on speed for public
values. The dividing line is the security claim, not the width of the operands.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/crypto-safe/)
for the full reference.
