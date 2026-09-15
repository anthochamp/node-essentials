import { expect, suite, test } from "vitest";

import { distinctStrings, hashString } from "./__fixtures__/hash.js";
import { CountMinSketch } from "./count-min-sketch.js";
import { CuckooFilter } from "./cuckoo-filter.js";
import { TopK } from "./top-k.js";

suite("CountMinSketch", () => {
	const sketch = (): CountMinSketch<string> =>
		new CountMinSketch<string>({ hash: hashString, epsilon: 0.001 });

	test("should reject invalid sizing parameters", () => {
		expect(
			() => new CountMinSketch<string>({ hash: hashString, epsilon: 0 }),
		).toThrow(RangeError);
		expect(
			() => new CountMinSketch<string>({ hash: hashString, delta: 1 }),
		).toThrow(RangeError);
	});

	test("should estimate zero for an item never added", () => {
		expect(sketch().estimate("absent")).toBe(0);
	});

	test("should never under-count", () => {
		const counts = sketch();
		const truth = new Map<string, number>();

		for (const [index, item] of distinctStrings(500).entries()) {
			const times = (index % 7) + 1;

			counts.add(item, times);
			truth.set(item, times);
		}

		for (const [item, times] of truth) {
			expect(counts.estimate(item)).toBeGreaterThanOrEqual(times);
		}
	});

	test("should stay within its error bound", () => {
		const counts = sketch();
		const items = distinctStrings(2000);

		counts.addAll(items);

		const bound = 0.001 * counts.total();

		for (const item of items) {
			expect(counts.estimate(item) - 1).toBeLessThanOrEqual(bound);
		}
	});

	test("should track an exact total", () => {
		const counts = sketch();

		counts.add("a", 5);
		counts.add("b", 3);

		expect(counts.total()).toBe(8);
	});

	test("should reject a negative or fractional count", () => {
		const counts = sketch();

		expect(() => counts.add("a", -1)).toThrow(RangeError);
		expect(() => counts.add("a", 1.5)).toThrow(RangeError);
	});

	test("should treat adding zero as a no-op", () => {
		const counts = sketch();

		counts.add("a", 0);

		expect(counts.total()).toBe(0);
		expect(counts.estimate("a")).toBe(0);
	});

	test("should clear back to empty", () => {
		const counts = sketch();

		counts.add("a", 10);
		counts.clear();

		expect(counts.total()).toBe(0);
		expect(counts.estimate("a")).toBe(0);
	});

	suite("merge", () => {
		test("should sum both streams", () => {
			const left = sketch();
			const right = sketch();

			left.add("shared", 3);
			right.add("shared", 4);
			right.add("only-right", 2);

			left.merge(right);

			expect(left.total()).toBe(9);
			expect(left.estimate("shared")).toBeGreaterThanOrEqual(7);
			expect(left.estimate("only-right")).toBeGreaterThanOrEqual(2);
		});

		test("should leave the merged-from sketch untouched", () => {
			const left = sketch();
			const right = sketch();

			right.add("a", 1);
			left.merge(right);

			expect(right.total()).toBe(1);
		});

		test("should refuse sketches of different dimensions", () => {
			const wide = new CountMinSketch<string>({
				hash: hashString,
				epsilon: 0.0001,
			});

			expect(() => sketch().merge(wide)).toThrow(RangeError);
		});
	});
});

suite("TopK", () => {
	const topK = (k: number): TopK<string> =>
		new TopK<string>({ hash: hashString, k, epsilon: 0.0001 });

	test("should reject a non-positive k", () => {
		expect(() => topK(0)).toThrow(RangeError);
		expect(() => topK(-1)).toThrow(RangeError);
	});

	test("should surface the heaviest hitters in order", () => {
		const tracker = topK(3);

		tracker.add("rare", 1);
		tracker.add("common", 50);
		tracker.add("frequent", 20);
		tracker.add("occasional", 5);

		const found = tracker.heavyHitters().map(({ item }) => item);

		expect(found.slice(0, 3)).toEqual(["common", "frequent", "occasional"]);
	});

	test("should track at most k candidates", () => {
		const tracker = topK(2);

		tracker.addAll(distinctStrings(100));

		expect(tracker.count()).toBe(2);
		expect(tracker.heavyHitters()).toHaveLength(2);
	});

	test("should find heavy hitters buried in a long tail", () => {
		const tracker = topK(3);

		// A long tail of singletons, then three genuinely heavy items.
		tracker.addAll(distinctStrings(5000, "tail"));
		tracker.add("heavy-a", 900);
		tracker.add("heavy-b", 800);
		tracker.add("heavy-c", 700);

		const found = tracker.heavyHitters().map(({ item }) => item);

		expect(found).toEqual(["heavy-a", "heavy-b", "heavy-c"]);
	});

	test("should report counts that never under-estimate", () => {
		const tracker = topK(2);

		tracker.add("a", 10);

		expect(tracker.estimate("a")).toBeGreaterThanOrEqual(10);
		expect(tracker.isTracked("a")).toBe(true);
		expect(tracker.isTracked("never-added")).toBe(false);
	});

	test("should estimate an untracked item from the sketch", () => {
		const tracker = topK(1);

		tracker.add("heavy", 100);
		tracker.add("light", 1);

		expect(tracker.isTracked("light")).toBe(false);
		expect(tracker.estimate("light")).toBeGreaterThanOrEqual(1);
	});

	test("should keep an exact total", () => {
		const tracker = topK(2);

		tracker.add("a", 5);
		tracker.add("b", 7);

		expect(tracker.total()).toBe(12);
	});

	test("should clear back to empty", () => {
		const tracker = topK(2);

		tracker.add("a", 5);
		tracker.clear();

		expect(tracker.count()).toBe(0);
		expect(tracker.total()).toBe(0);
		expect(tracker.heavyHitters()).toEqual([]);
	});
});

suite("CuckooFilter", () => {
	const filter = (expectedItems = 1000): CuckooFilter<string> =>
		new CuckooFilter<string>(undefined, {
			hash: hashString,
			expectedItems,
		});

	test("should reject invalid sizing parameters", () => {
		expect(
			() =>
				new CuckooFilter<string>(undefined, {
					hash: hashString,
					expectedItems: 0,
				}),
		).toThrow(RangeError);
		expect(
			() =>
				new CuckooFilter<string>(undefined, {
					hash: hashString,
					expectedItems: 10,
					bucketSize: 0,
				}),
		).toThrow(RangeError);
	});

	test("should never report a false negative for what it holds", () => {
		const items = distinctStrings(500);
		const cuckoo = filter(1000);

		expect(cuckoo.addAll(items)).toBe(items.length);

		for (const item of items) {
			expect(cuckoo.has(item)).toBe(true);
		}
	});

	test("should be empty before anything is added", () => {
		const cuckoo = filter();

		expect(cuckoo.count()).toBe(0);
		expect(cuckoo.loadFactor()).toBe(0);
		expect(cuckoo.has("anything")).toBe(false);
	});

	test("should delete an item, which a Bloom filter cannot", () => {
		const cuckoo = filter();

		cuckoo.add("present");
		expect(cuckoo.has("present")).toBe(true);

		expect(cuckoo.delete("present")).toBe(true);
		expect(cuckoo.has("present")).toBe(false);
		expect(cuckoo.count()).toBe(0);
	});

	test("should report a delete that matched nothing", () => {
		const cuckoo = filter();

		cuckoo.add("present");

		expect(cuckoo.delete("absent")).toBe(false);
		expect(cuckoo.count()).toBe(1);
	});

	test("should keep other items intact across deletions", () => {
		const items = distinctStrings(200);
		const cuckoo = filter(1000);

		cuckoo.addAll(items);

		for (const item of items.slice(0, 100)) {
			expect(cuckoo.delete(item)).toBe(true);
		}

		for (const item of items.slice(100)) {
			expect(cuckoo.has(item)).toBe(true);
		}

		expect(cuckoo.count()).toBe(100);
	});

	test("should hold duplicates as separate fingerprints", () => {
		const cuckoo = filter();

		cuckoo.add("same");
		cuckoo.add("same");

		expect(cuckoo.count()).toBe(2);

		cuckoo.delete("same");
		expect(cuckoo.has("same")).toBe(true);
	});

	test("should keep its false-positive rate low", () => {
		const cuckoo = filter(2000);

		cuckoo.addAll(distinctStrings(1500, "present"));

		let falsePositives = 0;
		const probes = distinctStrings(2000, "absent");

		for (const probe of probes) {
			if (cuckoo.has(probe)) {
				falsePositives++;
			}
		}

		expect(falsePositives / probes.length).toBeLessThan(0.05);
	});

	test("should refuse an insert rather than lose an item when saturated", () => {
		const cuckoo = new CuckooFilter<string>(undefined, {
			hash: hashString,
			expectedItems: 8,
			maxKicks: 8,
		});

		const accepted: string[] = [];

		for (const item of distinctStrings(500)) {
			if (cuckoo.add(item)) {
				accepted.push(item);
			}
		}

		// Whatever it accepted it must still hold: a refused insert may not have
		// dropped an earlier one.
		for (const item of accepted) {
			expect(cuckoo.has(item)).toBe(true);
		}

		expect(accepted.length).toBeLessThan(500);
		expect(cuckoo.loadFactor()).toBeLessThanOrEqual(1);
	});

	test("should clear every fingerprint", () => {
		const cuckoo = filter();

		cuckoo.addAll(distinctStrings(50));
		cuckoo.clear();

		expect(cuckoo.count()).toBe(0);
		expect(cuckoo.has("item-0")).toBe(false);
	});
});
