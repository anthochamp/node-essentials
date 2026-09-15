import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { sequentialChecksum } from "@ac-bench/util";
import { BoundedDeque, RingVector } from "@ac-kit/data";
import { FixedDeque } from "mnemonist";

const SIZE = 100_000;
const WANTED = sequentialChecksum(SIZE);

/**
 * Fixed-capacity deques only: everything here pre-allocates its backing at
 * construction and never resizes. Growable implementations belong in
 * `deque.bench.ts` — comparing the two mixes the cost of resizing into the
 * result and makes neither number mean anything.
 */
durationCondition(
	`Deque (fixed capacity) — ${SIZE} insertions at both ends, then drain both ends`,
	() => {
		const acKitDeque = new BoundedDeque<number>(undefined, { capacity: SIZE });
		const acKitRingVector = new RingVector<number>(undefined, {
			capacity: SIZE,
		});
		const mnemonistFixedDeque = new FixedDeque<number>(Array, SIZE);

		durationCase(
			"@ac-kit/data BoundedDeque over RingVector",
			{ tags: { kind: "js", backing: "ring vector" } },
			() => {
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) acKitDeque.push(index);
					else acKitDeque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item = index % 2 === 0 ? acKitDeque.pop() : acKitDeque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@ac-kit/data RingVector directly",
			{ tags: { kind: "js", backing: "ring vector" } },
			() => {
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) acKitRingVector.pushBack(index);
					else acKitRingVector.pushFront(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item =
						index % 2 === 0
							? acKitRingVector.popBack()
							: acKitRingVector.popFront();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"mnemonist FixedDeque (npm)",
			{ tags: { kind: "js", backing: "ring buffer" } },
			() => {
				let sum = 0;
				for (let index = 0; index < SIZE; index++) {
					if (index % 2 === 0) mnemonistFixedDeque.push(index);
					else mnemonistFixedDeque.unshift(index);
				}
				for (let index = 0; index < SIZE; index++) {
					const item =
						index % 2 === 0
							? mnemonistFixedDeque.pop()
							: mnemonistFixedDeque.shift();
					sum = (sum + (item ?? 0)) >>> 0;
				}
				assert.strictEqual(sum, WANTED);
			},
		);
	},
);
