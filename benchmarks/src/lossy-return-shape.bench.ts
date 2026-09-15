import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";

/**
 * `LossyQueue.enqueue`'s dropped-items return is `readonly T[]` (a shared
 * frozen empty array in the common no-drop case), not `IterableIterator<T>`,
 * specifically because a generator would allocate on every call including the
 * overwhelmingly common nothing-was-dropped case. This benchmark is the
 * measurement that assumption rests on, corrected from the result rather than
 * from intuition.
 *
 * Both contenders share the identical backing (a plain array, `shift`/`push`)
 * so the only variable is the return shape itself — comparing against the real
 * `LossyQueue` (`LinkedList`-backed) would confound the return-shape question
 * with a backing-storage question.
 *
 * Two scenarios: capacity far above the workload size (eviction never happens,
 * isolating pure per-call overhead) and capacity `1` (eviction happens on every
 * call after the first, isolating the drop-path cost).
 */

const SIZE = 20_000;
const EMPTY_ARRAY: readonly never[] = Object.freeze([]);

function enqueueArray(
	backing: number[],
	capacity: number,
	item: number,
): readonly number[] {
	if (backing.length >= capacity) {
		const dropped = backing.shift()!;
		backing.push(item);
		return [dropped];
	}
	backing.push(item);
	return EMPTY_ARRAY;
}

function* enqueueGenerator(
	backing: number[],
	capacity: number,
	item: number,
): IterableIterator<number> {
	if (backing.length >= capacity) {
		yield backing.shift()!;
	}
	backing.push(item);
}

durationCondition("LossyQueue.enqueue return shape — never evicts", () => {
	durationCase(
		"array return (current)",
		{ tags: { kind: "js", shape: "array" } },
		() => {
			const backing: number[] = [];
			const capacity = SIZE + 1;
			let droppedCount = 0;
			for (let index = 0; index < SIZE; index++) {
				droppedCount += enqueueArray(backing, capacity, index).length;
			}
			assert.strictEqual(droppedCount, 0);
			assert.strictEqual(backing.length, SIZE);
		},
	);
	durationCase(
		"generator return (candidate)",
		{ tags: { kind: "js", shape: "generator" } },
		() => {
			const backing: number[] = [];
			const capacity = SIZE + 1;
			let droppedCount = 0;
			for (let index = 0; index < SIZE; index++) {
				for (const _dropped of enqueueGenerator(backing, capacity, index))
					droppedCount++;
			}
			assert.strictEqual(droppedCount, 0);
			assert.strictEqual(backing.length, SIZE);
		},
	);
});

durationCondition("LossyQueue.enqueue return shape — always evicts", () => {
	durationCase(
		"array return (current)",
		{ tags: { kind: "js", shape: "array" } },
		() => {
			const backing: number[] = [];
			const capacity = 1;
			let droppedCount = 0;
			for (let index = 0; index < SIZE; index++) {
				droppedCount += enqueueArray(backing, capacity, index).length;
			}
			assert.strictEqual(droppedCount, SIZE - 1);
			assert.strictEqual(backing.length, 1);
		},
	);
	durationCase(
		"generator return (candidate)",
		{ tags: { kind: "js", shape: "generator" } },
		() => {
			const backing: number[] = [];
			const capacity = 1;
			let droppedCount = 0;
			for (let index = 0; index < SIZE; index++) {
				for (const _dropped of enqueueGenerator(backing, capacity, index))
					droppedCount++;
			}
			assert.strictEqual(droppedCount, SIZE - 1);
			assert.strictEqual(backing.length, 1);
		},
	);
});
