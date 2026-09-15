# @ac-kit/crypto-random

Random bytes suitable for keys, tokens, nonces and salts. `Math.random()` is
not: it is fast, seeded from something guessable, and its output can be
reconstructed from a handful of samples. This draws instead from the operating
system's entropy pool through `crypto.getRandomValues`.

Reach for it when generating a session identifier, a password-reset token, an
IV, or anything an attacker must not be able to predict.

```typescript
import { getRandomBytes } from "@ac-kit/crypto-random";

const token = getRandomBytes(32);
const hex = Buffer.from(token).toString("hex");
```

`getRandomBytes(length)` returns exactly `length` fresh bytes and throws
`RangeError` when `length` is not a non-negative integer. It is synchronous:
there is no promise to await and no generator object to keep alive.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/crypto-random/)
for the full reference.
