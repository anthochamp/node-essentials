import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { checksum, randomUint32Values } from "@ac-bench/util";
import { BinaryHeap } from "@ac-kit/data";
import { Heap as DsJsHeap } from "@datastructures-js/heap";
import { Heap as HeapJs } from "heap-js";
import { Heap as MnemonistHeap } from "mnemonist";

const SIZE = 20_000;
const VALUES = randomUint32Values(SIZE);
const WANTED = checksum(VALUES);

durationCondition(
	"Binary heap — insert 20 000 unordered, extract all in order",
	() => {
		durationCase("Array + sort", { tags: { kind: "js" } }, () => {
			const array: number[] = [];
			for (const value of VALUES) array.push(value);
			array.sort((a, b) => a - b);
			let sum = 0;
			for (const item of array) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		});
		durationCase("@ac-kit/data BinaryHeap", { tags: { kind: "js" } }, () => {
			const heap = new BinaryHeap<number>((a, b) => a <= b);
			for (const value of VALUES) heap.insert(value);
			let sum = 0;
			for (
				let item = heap.extract();
				item !== undefined;
				item = heap.extract()
			) {
				sum = (sum + item) >>> 0;
			}
			assert.strictEqual(sum, WANTED);
		});
		durationCase("heap-js (npm)", { tags: { kind: "js" } }, () => {
			const heap = new HeapJs<number>((a, b) => a - b);
			for (const value of VALUES) heap.push(value);
			let sum = 0;
			for (let item = heap.pop(); item !== undefined; item = heap.pop())
				sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		});
		durationCase(
			"@datastructures-js/heap (npm)",
			{ tags: { kind: "js" } },
			() => {
				const heap = new DsJsHeap<number>((a, b) => a - b);
				for (const value of VALUES) heap.push(value);
				let sum = 0;
				for (let item = heap.pop(); item !== null; item = heap.pop())
					sum = (sum + item) >>> 0;
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase("mnemonist Heap (npm)", { tags: { kind: "js" } }, () => {
			const heap = new MnemonistHeap<number>((a, b) => a - b);
			for (const value of VALUES) heap.push(value);
			let sum = 0;
			for (let item = heap.pop(); item !== undefined; item = heap.pop())
				sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		});
	},
);
