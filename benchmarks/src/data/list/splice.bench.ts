import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import {
	ArrayList,
	CircularArrayList,
	DoublyLinkedList,
	LinkedList,
} from "@ac-kit/data";

const SIZE = 2_000;
const HALF = SIZE / 2;

durationCondition(
	"List — 1 000 insertions then 1 000 removals at the midpoint",
	() => {
		durationCase(
			"@ac-kit/.ArrayList.splice",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				const list = new ArrayList<number>();
				for (let index = 0; index < SIZE; index++)
					list.splice(list.count(), 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 1);
				assert.strictEqual(list.count(), SIZE);
			},
		);
		durationCase(
			"@ac-kit/.CircularArrayList.splice",
			{ tags: { kind: "js", backing: "circular array" } },
			() => {
				const list = new CircularArrayList<number>();
				for (let index = 0; index < SIZE; index++)
					list.splice(list.count(), 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 1);
				assert.strictEqual(list.count(), SIZE);
			},
		);
		durationCase(
			"@ac-kit/.LinkedList.splice",
			{ tags: { kind: "js", backing: "singly linked" } },
			() => {
				const list = new LinkedList<number>();
				for (let index = 0; index < SIZE; index++)
					list.splice(list.count(), 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 1);
				assert.strictEqual(list.count(), SIZE);
			},
		);
		durationCase(
			"@ac-kit/.DoublyLinkedList.splice",
			{ tags: { kind: "js", backing: "doubly linked" } },
			() => {
				const list = new DoublyLinkedList<number>();
				for (let index = 0; index < SIZE; index++)
					list.splice(list.count(), 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 0, index);
				for (let index = 0; index < HALF; index++)
					list.splice(list.count() >> 1, 1);
				assert.strictEqual(list.count(), SIZE);
			},
		);
		durationCase(
			"Array.splice",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				const array: number[] = [];
				for (let index = 0; index < SIZE; index++) array.push(index);
				for (let index = 0; index < HALF; index++)
					array.splice(array.length >> 1, 0, index);
				for (let index = 0; index < HALF; index++)
					array.splice(array.length >> 1, 1);
				assert.strictEqual(array.length, SIZE);
			},
		);
	},
);
