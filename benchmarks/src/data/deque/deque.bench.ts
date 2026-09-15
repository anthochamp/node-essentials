import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import { sequentialChecksum } from "@ac-bench/util";
import { Deque, DoublyLinkedList, SegmentedRingVector } from "@ac-kit/data";
import { Deque as DsJsDeque } from "@datastructures-js/deque";
import Denque from "denque";
import DeQueue from "double-ended-queue";

const SIZE = 10_000;
const INITIAL_ITEMS = Array.from({ length: SIZE }, (_, i) => i);
const WANTED = sequentialChecksum(SIZE);

let temp: any;

durationCondition(`Deque (growable) — construct with ${SIZE} items`, () => {
	durationCase(
		"Array (copy)",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			temp = [...INITIAL_ITEMS];
			assert.strictEqual(temp.length, SIZE);
		},
	);
	durationCase(
		"@ac-kit/data Deque",
		{ tags: { kind: "js", backing: "ring vector" } },
		() => {
			temp = new Deque<number>(INITIAL_ITEMS);
			assert.strictEqual(temp.count(), SIZE);
		},
	);
	durationCase(
		"@ac-kit/data Deque over SegmentedRingVector",
		{ tags: { kind: "js", backing: "segmented ring vector" } },
		() => {
			temp = new Deque<number>(INITIAL_ITEMS, {
				storage: new SegmentedRingVector<number>(),
			});
			assert.strictEqual(temp.count(), SIZE);
		},
	);
	durationCase(
		"@ac-kit/data Deque over DoublyLinkedList",
		{ tags: { kind: "js", backing: "linked list" } },
		() => {
			temp = new Deque<number>(INITIAL_ITEMS, {
				storage: new DoublyLinkedList<number>(),
			});
			assert.strictEqual(temp.count(), SIZE);
		},
	);
	durationCase(
		"double-ended-queue (npm)",
		{ tags: { kind: "js", backing: "ring buffer" } },
		() => {
			temp = new DeQueue<number>(INITIAL_ITEMS);
			assert.strictEqual(temp.length, SIZE);
		},
	);
	durationCase(
		"denque (npm)",
		{ tags: { kind: "js", backing: "ring buffer" } },
		() => {
			temp = new Denque<number>(INITIAL_ITEMS);
			assert.strictEqual(temp.length, SIZE);
		},
	);
	durationCase(
		"@datastructures-js/deque (npm)",
		{ tags: { kind: "js", backing: "?" } },
		() => {
			// @datastructures-js/deque does not copy the array, so we spread it to be fair.
			temp = new DsJsDeque<number>([...INITIAL_ITEMS]);
			assert.strictEqual(temp.size(), SIZE);
		},
	);
});

durationCondition(
	`Deque (growable) — ${SIZE} insertions at both ends, then drain both ends`,
	() => {
		durationCase(
			"Array push/unshift/pop/shift",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				const array: number[] = [];
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) array.push(index);
					else array.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? array.pop() : array.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@ac-kit/data Deque",
			{ tags: { kind: "js", backing: "ring vector" } },
			() => {
				const deque = new Deque<number>();
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.push(index);
					else deque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.pop() : deque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@ac-kit/data Deque over SegmentedRingVector",
			{ tags: { kind: "js", backing: "segmented ring vector" } },
			() => {
				const deque = new Deque<number>(undefined, {
					storage: new SegmentedRingVector<number>(),
				});
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.push(index);
					else deque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.pop() : deque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@ac-kit/data Deque over DoublyLinkedList",
			{ tags: { kind: "js", backing: "linked list" } },
			() => {
				const deque = new Deque<number>(undefined, {
					storage: new DoublyLinkedList<number>(),
				});
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.push(index);
					else deque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.pop() : deque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"double-ended-queue (npm)",
			{ tags: { kind: "js", backing: "ring buffer" } },
			() => {
				const deque = new DeQueue<number>();
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.push(index);
					else deque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.pop() : deque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"denque (npm)",
			{ tags: { kind: "js", backing: "ring buffer" } },
			() => {
				const deque = new Denque<number>();
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.push(index);
					else deque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.pop() : deque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@datastructures-js/deque (npm)",
			{ tags: { kind: "js", backing: "?" } },
			() => {
				const deque = new DsJsDeque<number>();
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) deque.pushBack(index);
					else deque.pushFront(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? deque.popBack() : deque.popFront();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
	},
);

const RESOURCE_SIZE = 200_000;
const RESOURCE_WANTED = sequentialChecksum(RESOURCE_SIZE);

resourceCondition(
	`Deque (growable) — ${RESOURCE_SIZE} insertions at both ends, then drain both ends`,
	() => {
		resourceCase(
			"empty case",
			{ tags: { kind: "js", role: "floor" } },
			() => {},
		);

		resourceCase(
			"@ac-kit/data Deque over RingVector",
			{ tags: { kind: "js", backing: "ring vector" } },
			() => {
				const acKitDeque = new Deque<number>();
				let sum = 0;
				for (let index = 0; index < RESOURCE_SIZE; index++) {
					if (index % 2 === 0) acKitDeque.push(index);
					else acKitDeque.unshift(index);
				}
				for (let index = 0; index < RESOURCE_SIZE; index++) {
					const item = index % 2 === 0 ? acKitDeque.pop() : acKitDeque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, RESOURCE_WANTED);
			},
		);

		resourceCase(
			"@datastructures-js/deque (npm)",
			{ tags: { kind: "js", backing: "?" } },
			() => {
				const dsJsDeque = new DsJsDeque<number>();
				let sum = 0;
				for (let index = 0; index < RESOURCE_SIZE; index++) {
					if (index % 2 === 0) dsJsDeque.pushBack(index);
					else dsJsDeque.pushFront(index);
				}
				for (let index = 0; index < RESOURCE_SIZE; index++) {
					const item =
						index % 2 === 0 ? dsJsDeque.popBack() : dsJsDeque.popFront();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, RESOURCE_WANTED);
			},
		);
	},
);
