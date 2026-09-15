# @ac-kit/data

Generic data structures: sequences, associative collections, trees, graphs,
indexes and probabilistic sketches.

| family            | types                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Sequences         | `ArrayList`, `CircularArrayList`, `LinkedList`, `DoublyLinkedList`                       |
| Queues and stacks | `Queue`, `Deque`, `Stack`, `BinaryHeap`, `PriorityQueue`                                 |
| Sets and maps     | `EnhancedSet`, `MultiSet`, `MultiMap`, `FuzzyMap`, `FuzzyMultiMap`                       |
| Caches            | `LruMap`, `LruCache`                                                                     |
| Trees             | `BinarySearchTree`, `AvlTree`, `Trie`                                                    |
| Graphs            | `Graph`, `DirectedGraph`, `StaticDisjointSet`                                            |
| Indexes           | `InvertedIndex`, `SuffixArray`, `GeneralizedSuffixArray`, `VpTree`, `StaticIntervalTree` |
| Bit-packed        | `BitSet`, `BitVector`                                                                    |
| Probabilistic     | `BloomFilter`, `CuckooFilter`, `CountMinSketch`, `HyperLogLog`, `TopK`                   |
| Storage backings  | `RingVector`, `TypedVector`                                                              |

Each sequence-like abstract data type comes as a family of classes, one per
answer to "what happens when it is full", rather than one class with a flag:

| variant     | when full                             | example                                           |
| ----------- | ------------------------------------- | ------------------------------------------------- |
| `Queue`     | never full                            | `new Queue()`                                     |
| `BoundedX`  | throws                                | `new BoundedQueue(undefined, { capacity: 100 })`  |
| `BlockingX` | `waitEnqueue` waits, `enqueue` throws | `new BlockingQueue(undefined, { capacity: 100 })` |
| `LossyX`    | evicts or skips                       | `new LossyQueue(undefined, { capacity: 100 })`    |

The capacity model is the class; the backing is an option. A fixed-size
collection is any bounded class over a storage that already knows how big it is,
with the size stated once:

```ts
new BoundedDeque(undefined, {
  storage: new RingVector(undefined, { capacity: 1024 }),
});
```

## Adding one item, or many

No method takes a rest parameter. Every insertion is unary, with a batch sibling
beside it — `enqueue`/`enqueueAll`, `push`/`pushAll`, `insert`/`insertAll`,
`splice`/`spliceAll`, `insertAfter`/`insertAllAfter`:

```ts
queue.enqueue(item); // one, allocating nothing
queue.enqueueAll(items); // many, growing the backing once
```

The batch form is not a convenience wrapper — on a growable backing it is
roughly twice as fast as the equivalent loop, because it resizes once instead of
repeatedly.

## Approximate structures need a hash

`BloomFilter`, `CuckooFilter`, `CountMinSketch`, `HyperLogLog` and `TopK` each
take a required `hash: Hash32<T>`. There is no default, because
`@ac-kit/noncrypto-hash`'s `murmur3_32`, `xxhash_32`, `fnv_32` and `djb2` all
take a `Uint8Array` and no library can invent a canonical encoding from an
arbitrary `T` to bytes. Wrapping one takes a line:

```ts
import { murmur3_32 } from "@ac-kit/noncrypto-hash";

const encoder = new TextEncoder();
const hash: Hash32<string> = (item, seed) =>
  murmur3_32(encoder.encode(item), seed);
```

The accuracy bounds these structures document assume a uniformly distributed,
avalanching hash; a weak one invalidates the arithmetic rather than merely
degrading it.

See the [generated API docs](https://anthochamp.github.io/node-essentials/api/data/)
for the full reference.
