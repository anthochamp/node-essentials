import { describe, expect, it } from "vitest";
import { HttpTrailers } from "./http-trailers.js";

describe("HttpTrailers", () => {
	describe("constructor", () => {
		it("should create empty trailers", () => {
			const trailers = new HttpTrailers();
			expect(trailers.has("any-field")).toBe(false);
		});

		it("should create trailers from object", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": "value2",
			});
			expect(trailers.get("x-trailer-1")).toEqual(["value1"]);
			expect(trailers.get("x-trailer-2")).toEqual(["value2"]);
		});

		it("should create trailers from iterable with single values", () => {
			const entries: [string, string][] = [
				["x-trailer-1", "value1"],
				["x-trailer-2", "value2"],
			];
			const trailers = new HttpTrailers(entries);
			expect(trailers.get("x-trailer-1")).toEqual(["value1"]);
			expect(trailers.get("x-trailer-2")).toEqual(["value2"]);
		});

		it("should create trailers from iterable with multiple values", () => {
			const entries: [string, string[]][] = [
				["x-trailer-1", ["value1"]],
				["x-trailer-2", ["value2", "value3"]],
			];
			const trailers = new HttpTrailers(entries);
			expect(trailers.get("x-trailer-1")).toEqual(["value1"]);
			expect(trailers.get("x-trailer-2")).toEqual(["value2", "value3"]);
		});
	});

	describe("field operations", () => {
		it("should set and get trailer values", () => {
			const trailers = new HttpTrailers();
			trailers.set("x-custom-trailer", ["custom-value"]);
			expect(trailers.get("x-custom-trailer")).toEqual(["custom-value"]);
		});

		it("should handle multiple values for same field", () => {
			const trailers = new HttpTrailers();
			trailers.append("x-multi", "value1");
			trailers.append("x-multi", "value2");
			expect(trailers.get("x-multi")).toEqual(["value1", "value2"]);
		});

		it("should set multiple values at once", () => {
			const trailers = new HttpTrailers();
			trailers.set("x-multi", ["value1", "value2", "value3"]);
			expect(trailers.get("x-multi")).toEqual(["value1", "value2", "value3"]);
		});

		it("should delete trailer fields", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": "value2",
			});
			expect(trailers.has("x-trailer-1")).toBe(true);
			trailers.delete("x-trailer-1");
			expect(trailers.has("x-trailer-1")).toBe(false);
			expect(trailers.has("x-trailer-2")).toBe(true);
		});

		it("should handle case-insensitive field names", () => {
			const trailers = new HttpTrailers();
			trailers.set("X-Custom-Trailer", ["value"]);
			expect(trailers.get("x-custom-trailer")).toEqual(["value"]);
			expect(trailers.get("X-CUSTOM-TRAILER")).toEqual(["value"]);
			expect(trailers.has("x-CuStOm-TrAiLeR")).toBe(true);
		});

		it("should clear all fields", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": "value2",
			});
			expect(trailers.has("x-trailer-1")).toBe(true);
			trailers.clear();
			expect(trailers.has("x-trailer-1")).toBe(false);
			expect(trailers.has("x-trailer-2")).toBe(false);
		});

		it("should set null to delete field", () => {
			const trailers = new HttpTrailers({
				"x-trailer": "value",
			});
			expect(trailers.has("x-trailer")).toBe(true);
			trailers.set("x-trailer", null);
			expect(trailers.has("x-trailer")).toBe(false);
		});
	});

	describe("iteration", () => {
		it("should iterate over trailer entries", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": "value2",
			});

			const entries = Array.from(trailers);
			expect(entries).toHaveLength(2);
			expect(entries).toContainEqual(["x-trailer-1", ["value1"]]);
			expect(entries).toContainEqual(["x-trailer-2", ["value2"]]);
		});

		it("should iterate over trailer keys", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": "value2",
			});

			// Extract all entries using iteration
			const allEntries = Array.from(trailers);
			const keys = allEntries.map(([name]) => name);
			expect(keys).toHaveLength(2);
			expect(keys).toContain("x-trailer-1");
			expect(keys).toContain("x-trailer-2");
		});

		it("should iterate over folded entries", () => {
			const trailers = new HttpTrailers({
				"x-trailer-1": "value1",
				"x-trailer-2": ["value2", "value3"],
			});

			const entries = Array.from(trailers.foldedEntries());
			expect(entries).toHaveLength(2);
			expect(entries).toContainEqual(["x-trailer-1", "value1"]);
			// Multiple values should be folded into one
			expect(entries).toContainEqual(["x-trailer-2", "value2, value3"]);
		});
	});

	describe("inheritance from HttpFields", () => {
		it("should support all HttpFields methods", () => {
			const trailers = new HttpTrailers({
				"x-trailer": "value",
			});

			// Test that it has HttpFields properties/methods
			expect(trailers.get("x-trailer")).toEqual(["value"]);
			expect(trailers.has("x-trailer")).toBe(true);
		});

		it("should support filtering", () => {
			const trailers = new HttpTrailers({
				"x-keep": "value1",
				"x-remove": "value2",
			});

			const filtered = trailers.filter((name) => name.startsWith("x-keep"));
			expect(filtered.has("x-keep")).toBe(true);
			expect(filtered.has("x-remove")).toBe(false);
		});
	});
});
