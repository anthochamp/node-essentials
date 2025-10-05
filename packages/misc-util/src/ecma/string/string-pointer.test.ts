import { expect, suite, test } from "vitest";
import { StringPointer } from "./string-pointer.js";

suite("StringPointer", () => {
	test("should create a StringPointer", () => {
		const sp = new StringPointer("Hello, world!");
		expect(sp).toBeInstanceOf(StringPointer);
		expect(sp.offset).toBe(0);
	});

	test("should get the value from the current offset", () => {
		const sp = new StringPointer("Hello, world!");
		expect(sp.value).toBe("Hello, world!");

		sp.offset = 7;
		expect(sp.value).toBe("world!");

		sp.offset = 13;
		expect(sp.value).toBe("");
	});

	test("should check if the offset is out of range", () => {
		const sp = new StringPointer("Hello, world!");
		expect(sp.isOutOfRange()).toBe(false);

		sp.offset = -1;
		expect(sp.isOutOfRange()).toBe(true);

		sp.offset = 13;
		expect(sp.isOutOfRange()).toBe(true);

		sp.offset = 14;
		expect(sp.isOutOfRange()).toBe(true);
	});

	test("should get the length of the remaining string", () => {
		const sp = new StringPointer("Hello, world!");
		expect(sp.length).toBe(13);

		sp.offset = 7;
		expect(sp.length).toBe(6);

		sp.offset = 13;
		expect(sp.length).toBe(0);

		sp.offset = 14;
		expect(sp.length).toBe(0);
	});

	test("should update the value when the offset changes", () => {
		const sp = new StringPointer("Hello, world!");
		expect(sp.value).toBe("Hello, world!");

		sp.offset = 7;
		expect(sp.value).toBe("world!");

		sp.offset = 0;
		expect(sp.value).toBe("Hello, world!");
	});
});
