import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { sequentialChecksum } from "@ac-bench/util";
import {
	ArrayList,
	CircularArrayList,
	DoublyLinkedList,
	LinkedList,
} from "@ac-kit/data";
import {
	DoublyLinkedList as DsJsDoublyLinkedList,
	LinkedList as DsJsLinkedList,
} from "@datastructures-js/linked-list";
import { LinkedList as MnemonistLinkedList } from "mnemonist";

const SIZE = 20_000;
const WANTED = sequentialChecksum(SIZE);

durationCondition("List — append 20 000, then one full scan", () => {
	durationCase(
		"@ac-kit/.ArrayList",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			const list = new ArrayList<number>();
			for (let index = 0; index < SIZE; index++)
				list.splice(list.count(), 0, index);
			let sum = 0;
			for (const item of list) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.CircularArrayList",
		{ tags: { kind: "js", backing: "circular array" } },
		() => {
			const list = new CircularArrayList<number>();
			for (let index = 0; index < SIZE; index++)
				list.splice(list.count(), 0, index);
			let sum = 0;
			for (const item of list) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.LinkedList",
		{ tags: { kind: "js", backing: "singly linked" } },
		() => {
			const list = new LinkedList<number>();
			for (let index = 0; index < SIZE; index++)
				list.splice(list.count(), 0, index);
			let sum = 0;
			for (const item of list) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.DoublyLinkedList",
		{ tags: { kind: "js", backing: "doubly linked" } },
		() => {
			const list = new DoublyLinkedList<number>();
			for (let index = 0; index < SIZE; index++)
				list.splice(list.count(), 0, index);
			let sum = 0;
			for (const item of list) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase("Array", { tags: { kind: "js", backing: "array" } }, () => {
		const array: number[] = [];
		for (let index = 0; index < SIZE; index++) array.push(index);
		let sum = 0;
		for (const item of array) sum = (sum + item) >>> 0;
		assert.strictEqual(sum, WANTED);
	});
	durationCase(
		"@datastructures-js/linked-list singly (npm)",
		{ tags: { kind: "js", backing: "singly linked" } },
		() => {
			const list = new DsJsLinkedList<number>();
			for (let index = 0; index < SIZE; index++) list.insertLast(index);
			let sum = 0;
			list.forEach((item) => {
				sum = (sum + item.getValue()) >>> 0;
			});
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@datastructures-js/linked-list doubly (npm)",
		{ tags: { kind: "js", backing: "doubly linked" } },
		() => {
			const list = new DsJsDoublyLinkedList<number>();
			for (let index = 0; index < SIZE; index++) list.insertLast(index);
			let sum = 0;
			list.forEach((item) => {
				sum = (sum + item.getValue()) >>> 0;
			});
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"mnemonist LinkedList (npm)",
		{ tags: { kind: "js", backing: "singly linked" } },
		() => {
			const list = new MnemonistLinkedList<number>();
			for (let index = 0; index < SIZE; index++) list.push(index);
			let sum = 0;
			for (const item of list) sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
});
