import { BufferOverflowError } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { TextBuffer } from "./text-buffer.js";

describe("TextBuffer", () => {
	it("appends and windows accumulated text", () => {
		const buffer = new TextBuffer(1024);
		buffer.append("hel");
		buffer.append("lo");
		expect(buffer.view()).toBe("hello");
		expect(buffer.buffered).toBe(5);
	});

	it("consume() drops units from the front, counted as UTF-16 code units", () => {
		const buffer = new TextBuffer(1024);
		buffer.append("hello world");
		buffer.consume(6);
		expect(buffer.view()).toBe("world");
	});

	it("take() returns and clears", () => {
		const buffer = new TextBuffer(1024);
		buffer.append("abc");
		expect(buffer.take()).toBe("abc");
		expect(buffer.buffered).toBe(0);
	});

	it("clear() discards without returning", () => {
		const buffer = new TextBuffer(1024);
		buffer.append("abc");
		buffer.clear();
		expect(buffer.view()).toBe("");
	});

	it("throws once the retention ceiling would be exceeded", () => {
		const buffer = new TextBuffer(4);
		buffer.append("abcd");
		expect(() => buffer.append("e")).toThrow(BufferOverflowError);
	});

	it("rejects a non-positive ceiling", () => {
		expect(() => new TextBuffer(0)).toThrow(RangeError);
	});
});
