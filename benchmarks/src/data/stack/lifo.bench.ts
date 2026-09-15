import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { sequentialChecksum } from "@ac-bench/util";
import { Stack } from "@ac-kit/data";
import { Stack as DsJsStack } from "@datastructures-js/stack";
import { Stack as MnemonistStack } from "mnemonist";

const SIZE = 10_000;
const WANTED = sequentialChecksum(SIZE);

durationCondition(`LIFO stack — push ${SIZE}, then pop all`, () => {
	durationCase(
		"@ac-kit/.Stack",
		{ tags: { kind: "js", backing: "linked list" } },
		() => {
			const stack = new Stack<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) stack.push(index);
			for (let item = stack.pop(); item !== undefined; item = stack.pop())
				sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"Array push/pop",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			const array: number[] = [];
			let sum = 0;
			for (let index = 0; index < SIZE; index++) array.push(index);
			while (array.length > 0) sum = (sum + array.pop()!) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"@datastructures-js/stack (npm)",
		{ tags: { kind: "js", backing: "?" } },
		() => {
			const stack = new DsJsStack<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) stack.push(index);
			while (!stack.isEmpty()) sum = (sum + stack.pop()!) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
	durationCase(
		"mnemonist Stack (npm)",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			const stack = new MnemonistStack<number>();
			let sum = 0;
			for (let index = 0; index < SIZE; index++) stack.push(index);
			for (let item = stack.pop(); item !== undefined; item = stack.pop())
				sum = (sum + item) >>> 0;
			assert.strictEqual(sum, WANTED);
		},
	);
});
