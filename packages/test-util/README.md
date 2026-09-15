# @ac-kit/test-util

Test-harness primitives with no dependency beyond `@ac-kit/core`.

Being dependency-free is the design constraint, not an accident: any package's
test suite may need these, so pulling in a heavier dependency here would force
it on every consumer.

```ts
import { busyWaitSync, expectCloseRelative } from "@ac-kit/test-util";

// Holds the event loop, unlike `setTimeout`, so a timing test observes real
// blocking rather than a yield.
busyWaitSync(50);

expectCloseRelative(measured, expected, 1e-9);
```

Also exposes `expectCompareAgreesWithEquals`, for asserting that a type's
comparator and its equality agree — the invariant an ordered container silently
relies on.

For helpers that drive and probe real external services (Docker containers,
TCP/TLS endpoints), see `@ac-kit/integration-test-util` instead — that package
is allowed heavier dependencies precisely because its own consumers are few.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/test-util/)
for the full reference.
