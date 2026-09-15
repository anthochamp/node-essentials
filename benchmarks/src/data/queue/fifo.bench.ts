import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { sequentialChecksum } from "@ac-bench/util";
import { Queue as DsJsQueue } from "@datastructures-js/queue";
import Denque from "denque";
import { Queue as MnemonistQueue } from "mnemonist";
import YoctoQueue from "yocto-queue";

import {
	jsCustomQueueWorkload,
	jsQueueWorkload,
} from "./__fixtures__/workload.js";

const SIZE = 100_000;
const WANTED = sequentialChecksum(SIZE);

/**
 * Growable FIFO queues only. Every contender here resizes on demand; a
 * fixed-capacity form would win on pre-allocation alone and would not be
 * measuring the same thing.
 */
durationCondition(`FIFO queue — enqueue ${SIZE}, draining as it fills`, () => {
	durationCase(
		"@ac-kit/data Queue",
		{ tags: { kind: "js", backing: "ring vector" } },
		() => {
			assert.strictEqual(jsQueueWorkload(SIZE), WANTED);
		},
	);
	durationCase(
		"Array + read cursor",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			assert.strictEqual(jsCustomQueueWorkload(SIZE), WANTED);
		},
	);
	durationCase(
		"@datastructures-js/queue (npm)",
		{ tags: { kind: "js", backing: "?" } },
		() => {
			const queue = new DsJsQueue<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) {
				queue.enqueue(index);
				if (index % 2 === 1) sum = (sum + queue.dequeue()!) >>> 0;
			}
			while (queue.size() > 0) sum = (sum + queue.dequeue()!) >>> 0;
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
				deque.push(index);
				if (index % 2 === 1) sum = (sum + (deque.shift() ?? 0)) >>> 0;
			}
			while (!deque.isEmpty()) sum = (sum + (deque.shift() ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"yocto-queue (npm)",
		{ tags: { kind: "js", backing: "linked list" } },
		() => {
			const queue = new YoctoQueue<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) {
				queue.enqueue(index);
				if (index % 2 === 1) sum = (sum + (queue.dequeue() ?? 0)) >>> 0;
			}
			while (queue.size > 0) sum = (sum + (queue.dequeue() ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"mnemonist Queue (npm)",
		{ tags: { kind: "js", backing: "linked list" } },
		() => {
			const queue = new MnemonistQueue<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) {
				queue.enqueue(index);
				if (index % 2 === 1) sum = (sum + (queue.dequeue() ?? 0)) >>> 0;
			}
			for (
				let item = queue.dequeue();
				item !== undefined;
				item = queue.dequeue()
			) {
				sum = (sum + item) >>> 0;
			}
			assert.strictEqual(sum, WANTED);
		},
	);
});
