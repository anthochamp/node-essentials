import { describe, expect, it } from "vitest";

import { createBisector } from "./create-bisector.js";

type Item = { id: number };

describe("createBisector", () => {
	const items: Item[] = [{ id: 1 }, { id: 3 }, { id: 3 }, { id: 5 }];
	const byId = createBisector<Item, number>((item) => item.id);

	it("should bisect left of duplicates by the accessor's key", () => {
		expect(byId.left(items, 3)).toBe(1);
	});

	it("should bisect right of duplicates by the accessor's key", () => {
		expect(byId.right(items, 3)).toBe(3);
	});

	it("should find the closest item by the accessor's key", () => {
		expect(byId.center(items, 4)).toBe(3);
		expect(byId.center(items, 0)).toBe(0);
	});

	it("should not call the accessor more than the underlying binary search does", () => {
		let calls = 0;
		const counting = createBisector<Item, number>((item) => {
			calls++;
			return item.id;
		});

		counting.left(items, 3);

		expect(calls).toBeLessThanOrEqual(Math.ceil(Math.log2(items.length + 1)));
	});
});
