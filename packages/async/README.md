# @ac-kit/async

Coordinating work that overlaps in time. JavaScript is single-threaded but not
single-tasked: two `await`ed operations interleave, so two handlers can read the
same value, both decide to act on it, and both write. These are the primitives
that make "only one at a time" and "wait until ready" expressible.

```typescript
import { Channel, LockHold, Mutex } from "@ac-kit/async";

const mutex = new Mutex();

async function withdraw(amount: number): Promise<void> {
  await using _ = await LockHold.from([mutex]);
  balance -= amount; // no other caller is inside this block
}

// A bounded queue: `send` blocks once capacity is reached, so a fast producer
// cannot outrun a slow consumer.
const work = new Channel<Job>(100);
await work.send(job, signal);
const next = await work.receive(signal);
```

`LockHold.from` acquires several locks in a globally consistent order, which is
what prevents two callers taking the same pair in opposite orders from
deadlocking. It is an `AsyncDisposable`, so `await using` releases in reverse
order however the block exits.

## What it exposes

- **Locks** — `Mutex`, `RwLock`, `Semaphore`, and `LockHold` for acquiring
  several at once. All implement `ILock`, which `@ac-kit/app-system`'s
  inter-process locks also satisfy, so a caller can switch between them.
- **Signalling** — `Latch`, `Barrier`, `Signal`, `Condition`, `Counter`.
- **Message passing** — `Channel` (bounded or unbounded), `Broadcast`,
  `QueueReceiver`, `RoundRobin`.
- **Events** — `Event`, `VoidEvent`, `IEventDispatcher` and the map variants,
  plus a helper turning a dispatcher into an async iterator.

Every blocking operation takes an optional `AbortSignal`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/async/)
for the full reference.
