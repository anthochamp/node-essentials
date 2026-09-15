import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { ICollection } from "../collection/icollection.js";
import { BlockingDeque } from "../deque/blocking-deque.js";
import { BoundedDeque } from "../deque/bounded-deque.js";
import { Deque } from "../deque/deque.js";
import { BinaryHeap } from "../heap/binary-heap.js";
import { BlockingBinaryHeap } from "../heap/blocking-binary-heap.js";
import { BoundedBinaryHeap } from "../heap/bounded-binary-heap.js";
import { ArrayList } from "../list/array-list.js";
import { BlockingArrayList } from "../list/blocking-array-list.js";
import { BlockingCircularArrayList } from "../list/blocking-circular-array-list.js";
import { BlockingDoublyLinkedList } from "../list/blocking-doubly-linked-list.js";
import { BlockingLinkedList } from "../list/blocking-linked-list.js";
import { BoundedArrayList } from "../list/bounded-array-list.js";
import { BoundedCircularArrayList } from "../list/bounded-circular-array-list.js";
import { BoundedDoublyLinkedList } from "../list/bounded-doubly-linked-list.js";
import { BoundedLinkedList } from "../list/bounded-linked-list.js";
import { CircularArrayList } from "../list/circular-array-list.js";
import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { LinkedList } from "../list/linked-list.js";
import { BlockingPriorityQueue } from "../priority-queue/blocking-priority-queue.js";
import { BoundedPriorityQueue } from "../priority-queue/bounded-priority-queue.js";
import { PriorityQueue } from "../priority-queue/priority-queue.js";
import { BlockingQueue } from "../queue/blocking-queue.js";
import { BoundedQueue } from "../queue/bounded-queue.js";
import { LossyQueue } from "../queue/lossy-queue.js";
import { Queue } from "../queue/queue.js";
import { BlockingStack } from "../stack/blocking-stack.js";
import { BoundedStack } from "../stack/bounded-stack.js";
import { Stack } from "../stack/stack.js";
import { RingVector } from "../storage/ring-vector.js";
import { SegmentedRingVector } from "../storage/segmented-ring-vector.js";

const CAPACITY = 10;

const priorityPairs = (
	iterator?: Iterable<number>,
): [number, number][] | undefined =>
	iterator
		? Array.from(iterator, (value): [number, number] => [value, value])
		: undefined;

/**
 * ICollection compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the ICollection
 * interface.
 */

suite.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], ICollection<number>>;
}>([
	{
		description: "BinaryHeap",
		factory: (iterator) => new BinaryHeap((a, b) => a < b, iterator),
	},
	{
		description: "Deque",
		factory: (iterator) => new Deque(iterator),
	},
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "LinkedList",
		factory: (iterator) => new LinkedList(iterator),
	},
	{
		description: "ArrayList",
		factory: (iterator) => new ArrayList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
	{
		description: "Queue",
		factory: (iterator) => new Queue(iterator),
	},
	{
		description: "Stack",
		factory: (iterator) => new Stack(iterator),
	},
	{
		description: "PriorityQueue",
		factory: (iterator) =>
			new PriorityQueue<number>(undefined, priorityPairs(iterator)),
	},
	{
		description: "LossyQueue",
		factory: (iterator) => new LossyQueue(iterator, { capacity: CAPACITY }),
	},
	{
		description: "RingVector",
		factory: (iterator) => new RingVector(iterator),
	},
	{
		description: "SegmentedRingVector",
		factory: (iterator) => new SegmentedRingVector(iterator),
	},
	{
		description: "BoundedQueue",
		factory: (iterator) => new BoundedQueue(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingQueue",
		factory: (iterator) => new BlockingQueue(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedDeque",
		factory: (iterator) => new BoundedDeque(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingDeque",
		factory: (iterator) => new BlockingDeque(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedStack",
		factory: (iterator) => new BoundedStack(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingStack",
		factory: (iterator) => new BlockingStack(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedBinaryHeap",
		factory: (iterator) =>
			new BoundedBinaryHeap<number>((a, b) => a < b, iterator, {
				capacity: CAPACITY,
			}),
	},
	{
		description: "BlockingBinaryHeap",
		factory: (iterator) =>
			new BlockingBinaryHeap<number>((a, b) => a < b, iterator, {
				capacity: CAPACITY,
			}),
	},
	{
		description: "BoundedPriorityQueue",
		factory: (iterator) =>
			new BoundedPriorityQueue<number>(undefined, priorityPairs(iterator), {
				capacity: CAPACITY,
			}),
	},
	{
		description: "BlockingPriorityQueue",
		factory: (iterator) =>
			new BlockingPriorityQueue<number>(undefined, priorityPairs(iterator), {
				capacity: CAPACITY,
			}),
	},
	{
		description: "BoundedArrayList",
		factory: (iterator) =>
			new BoundedArrayList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingArrayList",
		factory: (iterator) =>
			new BlockingArrayList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedCircularArrayList",
		factory: (iterator) =>
			new BoundedCircularArrayList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingCircularArrayList",
		factory: (iterator) =>
			new BlockingCircularArrayList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedLinkedList",
		factory: (iterator) =>
			new BoundedLinkedList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingLinkedList",
		factory: (iterator) =>
			new BlockingLinkedList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BoundedDoublyLinkedList",
		factory: (iterator) =>
			new BoundedDoublyLinkedList(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingDoublyLinkedList",
		factory: (iterator) =>
			new BlockingDoublyLinkedList(iterator, { capacity: CAPACITY }),
	},
])("$description ICollection compliance", ({ factory }) => {
	test("should iterate over items", () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		expect(Array.from(collection)).toEqual(expect.arrayContaining([1, 2, 3]));
	});

	test("should clear items", () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		collection.clear();
		expect(Array.from(collection)).toEqual([]);
	});

	test("should count items", () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		expect(collection.count()).toBe(3);
	});
});
