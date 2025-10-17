import { inspect } from "node:util";
import { expect, suite, test } from "vitest";
import { HttpFields } from "./http-fields.js";

suite("HttpHeaders", () => {
	test("should create empty fields", () => {
		const fields = new HttpFields();
		expect(fields.toString()).toBe("");
	});

	test("should create fields from object", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
		});
		expect(fields.toString()).toBe(
			"Content-Type: application/json\nX-Custom-Header: value1, value2\n",
		);
	});

	test("should get header values", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
		});
		expect(fields.get("Content-Type")).toEqual(["application/json"]);
		expect(fields.get("X-Custom-Header")).toEqual(["value1", "value2"]);
		expect(fields.get("Non-Existent")).toBeNull();
	});

	test("should set header values", () => {
		const fields = new HttpFields();
		fields.set("Content-Type", ["application/json"]);
		expect(fields.get("Content-Type")).toEqual(["application/json"]);
		fields.set("Content-Type", ["text/html"]);
		expect(fields.get("Content-Type")).toEqual(["text/html"]);
	});

	test("should append header values", () => {
		const fields = new HttpFields();
		fields.append("X-Custom-Header", "value1");
		expect(fields.get("X-Custom-Header")).toEqual(["value1"]);
		fields.append("X-Custom-Header", "value2", "value3");
		expect(fields.get("X-Custom-Header")).toEqual([
			"value1",
			"value2",
			"value3",
		]);
	});

	test("should delete fields", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
		});
		fields.delete("Content-Type");
		expect(fields.get("Content-Type")).toBeNull();
		expect(fields.get("X-Custom-Header")).toEqual(["value1", "value2"]);
		fields.delete("X-Custom-Header");
		expect(fields.get("X-Custom-Header")).toBeNull();
	});

	test("should clear all fields", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
		});
		fields.clear();
		expect(fields.get("Content-Type")).toBeNull();
		expect(fields.get("X-Custom-Header")).toBeNull();
	});

	test("should filter fields", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
			Authorization: "Bearer token",
		});
		const filtered = fields.filter(
			(name) => name === "Content-Type" || name === "Authorization",
		);
		expect(filtered.toString()).toBe(
			"Content-Type: application/json\nAuthorization: [REDACTED]\n",
		);
	});

	test("should redact sensitive fields in toString", () => {
		const fields = new HttpFields(
			{
				"Content-Type": "application/json",
				Authorization: "Bearer token",
				"X-Custom-Header": "value",
			},
			{
				sensitiveFields: ["Authorization", "X-Custom-Header"],
			},
		);
		expect(fields.toString()).toBe(
			"Content-Type: application/json\nAuthorization: [REDACTED]\nX-Custom-Header: [REDACTED]\n",
		);
	});

	test("toString should be overloaded", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
			Authorization: "Bearer token",
		});

		expect(`${fields}`).toBe(
			"Content-Type: application/json\nX-Custom-Header: value1, value2\nAuthorization: [REDACTED]\n",
		);
	});

	test("inspect should be overloaded (compact=false)", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
			Authorization: "Bearer token",
		});

		expect(inspect(fields, { depth: Infinity, compact: false })).toBe(
			"HttpFields\n  Content-Type: 'application/json'\n  X-Custom-Header: 'value1, value2'\n  Authorization: '[REDACTED]'",
		);
	});

	test("inspect should be overloaded (compact=true)", () => {
		const fields = new HttpFields({
			"Content-Type": "application/json",
			"X-Custom-Header": ["value1", "value2"],
			Authorization: "Bearer token",
		});

		expect(inspect(fields, { depth: Infinity, compact: true })).toBe(
			"HttpFields<Content-Type: 'application/json', X-Custom-Header: 'value1, value2', Authorization: '[REDACTED]'>",
		);
	});
});
