import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomUint32Values } from "@ac-bench/util";
import {
	ArrayList,
	CircularArrayList,
	DoublyLinkedList,
	LinkedList,
} from "@ac-kit/data";

const SIZE = 2_000;
const INDICES = randomUint32Values(SIZE).map((value) => value % SIZE);
let WANTED = 0;
for (const index of INDICES) WANTED = (WANTED + index) >>> 0;

const fillArrayList = (): ArrayList<number> => {
	const list = new ArrayList<number>();
	for (let index = 0; index < SIZE; index++)
		list.splice(list.count(), 0, index);
	return list;
};
const fillCircularArrayList = (): CircularArrayList<number> => {
	const list = new CircularArrayList<number>();
	for (let index = 0; index < SIZE; index++)
		list.splice(list.count(), 0, index);
	return list;
};
const fillLinkedList = (): LinkedList<number> => {
	const list = new LinkedList<number>();
	for (let index = 0; index < SIZE; index++)
		list.splice(list.count(), 0, index);
	return list;
};
const fillDoublyLinkedList = (): DoublyLinkedList<number> => {
	const list = new DoublyLinkedList<number>();
	for (let index = 0; index < SIZE; index++)
		list.splice(list.count(), 0, index);
	return list;
};

const ARRAY_LIST = fillArrayList();
const CIRCULAR_ARRAY_LIST = fillCircularArrayList();
const LINKED_LIST = fillLinkedList();
const DOUBLY_LINKED_LIST = fillDoublyLinkedList();
const ARRAY = Array.from({ length: SIZE }, (_, index) => index);

durationCondition("List — 2 000 reads at pseudo-random positions", () => {
	durationCase(
		"@ac-kit/.ArrayList.get",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			let sum = 0;
			for (const index of INDICES)
				sum = (sum + (ARRAY_LIST.get(index) ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.CircularArrayList.get",
		{ tags: { kind: "js", backing: "circular array" } },
		() => {
			let sum = 0;
			for (const index of INDICES)
				sum = (sum + (CIRCULAR_ARRAY_LIST.get(index) ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.LinkedList.get",
		{ tags: { kind: "js", backing: "singly linked" } },
		() => {
			let sum = 0;
			for (const index of INDICES)
				sum = (sum + (LINKED_LIST.get(index) ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@ac-kit/.DoublyLinkedList.get",
		{ tags: { kind: "js", backing: "doubly linked" } },
		() => {
			let sum = 0;
			for (const index of INDICES)
				sum = (sum + (DOUBLY_LINKED_LIST.get(index) ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"Array index",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			let sum = 0;
			for (const index of INDICES) sum = (sum + (ARRAY[index] ?? 0)) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
});
