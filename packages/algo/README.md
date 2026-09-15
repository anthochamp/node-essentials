# @ac-kit/algo

Classic algorithms that work on **your** types, not on numbers.

Nothing here assumes what an element is. Ordering, equality, scoring and
neighbour expansion are all supplied as callbacks, so the same `quickselect`
sorts your invoices by due date and your pixels by luminance, and the same graph
search walks your dependency tree and your maze.

```ts
import { groupBy, quickselect, uniqBy } from "@ac-kit/algo";

// Order statistics without paying for a full sort — O(n) average.
const median = quickselect(
  [...durations],
  durations.length >> 1,
  (a, b) => a - b,
);

// Group by any derived key; add more accessors to nest another level.
const byOwner = groupBy(tasks, [(task) => task.ownerId]);

// Deduplicate lazily — nothing is materialized until you pull.
const distinct = [...uniqBy(events, (event) => event.correlationId)];
```

## What's included

- **Graph search** — `dfs` with enter/exit hooks and skip/stop control, `aStar`
  (which is Dijkstra's algorithm when you give it no heuristic) and greedy
  `bestFirstSearch`, all over a `childrenOf`/`neighboursOf` callback rather than
  any particular graph type.
- **State-space search** — `beamSearch` for a width-bounded exploration, and
  `backtrack` for constraint search that undoes its own moves on the way back
  out of a dead end.
- **Binary search** — `bisect`, `bisectLeft`, `bisectRight`, `bisectCenter` and
  a reusable `createBisector` bound to one accessor, plus membership testing
  against sorted, disjoint intervals.
- **Selection** — `quickselect` for order statistics, `minBy`/`maxBy` for the
  extreme item by a derived key, `selectAt` for picking positions.
- **Sorting** — `radixSort`, a stable, comparator-free sort over an integer key.
- **Grouping** — `groupBy` (nesting one `Map` level per accessor), `partition`,
  `partitionIndices`, `uniq` and `uniqBy`.
- **Set algebra** — `union`, `intersection`, `difference`,
  `symmetricDifference`, and the `isSubsetOf` / `isSupersetOf` /
  `isDisjointFrom` predicates — over any iterables.
- **Shuffling** — `shuffle` (Fisher–Yates or Sattolo) with the random source
  injectable, so results can be made reproducible, and `spreadEvenly` to
  interleave two collections at evenly spaced positions.

## What's not included

This package deliberately stops at three boundaries, so if you are looking for
one of these you want a different one:

- **Anything with a security claim** — message digests, ciphers, signatures, key
  derivation. Use the `@ac-kit/crypto-*` packages. Non-cryptographic hashes and
  checksums, built for distribution and speed and unsafe against an adversary,
  are `@ac-kit/noncrypto-hash`.
- **Anything whose subject is a number** — statistics, linear algebra, geometry,
  numeric domains. Use the `@ac-kit/math-*` packages instead.
- **Anything you build once and query repeatedly** — heaps, tries, graphs, sets
  with custom equality, multi-pattern matchers, alias tables. Everything here is
  one-shot: give it an input, get a result. Use `@ac-kit/data` instead.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes. It depends only on `@ac-kit/core` and `@ac-kit/data`.

See the [generated API docs](https://anthochamp.github.io/node-essentials/api/algo/)
for the full reference.
