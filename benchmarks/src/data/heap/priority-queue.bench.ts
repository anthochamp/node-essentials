import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { checksum, randomUint32Values } from "@ac-bench/util";
import { PriorityQueue } from "@ac-kit/data";
import { MinPriorityQueue as DsJsMinPriorityQueue } from "@datastructures-js/priority-queue";

const SIZE = 20_000;
const VALUES = randomUint32Values(SIZE);
const WANTED = checksum(VALUES);

durationCondition(
	"Priority queue — insert 20 000 keyed, extract in priority order",
	() => {
		durationCase("@ac-kit/data PriorityQueue", { tags: { kind: "js" } }, () => {
			const queue = new PriorityQueue<number, number>();
			for (const value of VALUES) queue.insert(value, value);
			let sum = 0;
			let previous = 0;
			for (
				let item = queue.extract();
				item !== undefined;
				item = queue.extract()
			) {
				if (item < previous)
					throw new Error("priority queue yielded values out of order");
				previous = item;
				sum = (sum + item) >>> 0;
			}
			assert.strictEqual(sum, WANTED);
		});
		durationCase(
			"@datastructures-js/priority-queue (npm)",
			{ tags: { kind: "js" } },
			() => {
				const queue = new DsJsMinPriorityQueue<number>((value) => value);
				for (const value of VALUES) queue.enqueue(value);
				let sum = 0;
				while (queue.size() > 0) sum = (sum + queue.dequeue()!) >>> 0;
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase("Array + sort by priority", { tags: { kind: "js" } }, () => {
			const array: [number, number][] = [];
			for (const value of VALUES) array.push([value, value]);
			array.sort((a, b) => a[1] - b[1]);
			let sum = 0;
			for (const [item] of array) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		});
	},
);
