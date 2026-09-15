import { expect, suite, test } from "vitest";

import { ReportEvent } from "../events.js";
import { MemorySink } from "../sink/memory-sink.js";
import { createRedactionProxy } from "./redaction-proxy.js";

suite("RedactionProxy", () => {
	test("redacts an exact attribute path", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, {
			attributePaths: [["auth", "password"]],
		});

		await proxy.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		await proxy.write({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes: { auth: { password: "hunter2", user: "bob" } },
		});

		expect(inner.events[1]).toEqual({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes: { auth: { password: "[redacted]", user: "bob" } },
		});
	});

	test("does not mutate the original attributes object", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, { attributePaths: [["token"]] });
		const attributes = { token: "secret" };

		await proxy.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		await proxy.write({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes,
		});

		expect(attributes.token).toBe("secret");
	});

	test("redacts a secret exposed through a getter", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, {
			attributePaths: [["token"]],
			patterns: [/hunter2/],
		});
		const attributes = {
			get token(): string {
				return "hunter2";
			},
		};

		await proxy.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		await proxy.write({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes,
		});

		expect(inner.events[1]).toEqual({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes: { token: "[redacted]" },
		});
	});

	test("redacts matches of a pattern in output chunks", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, {
			patterns: [/sk-[a-z0-9]+/g],
		});

		await proxy.write({
			kind: "output",
			timestamp: 0,
			scopeId: null,
			stream: "stdout",
			chunk: "using key sk-abc123 for this request",
		});

		const event = inner.events[0] as Extract<
			ReportEvent<never>,
			{ kind: "output" }
		>;
		expect(event.chunk).toBe("using key [redacted] for this request");
	});

	test("redacts matching string values found anywhere inside attributes", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, { patterns: [/^secret-.*$/] });

		await proxy.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		await proxy.write({
			kind: "scope-attributes",
			timestamp: 0,
			scopeId: "a",
			attributes: { nested: { value: "secret-abc" }, other: "fine" },
		});

		expect(inner.events[1]).toMatchObject({
			attributes: { nested: { value: "[redacted]" }, other: "fine" },
		});
	});

	test("redacts a text/* attachment body but leaves non-text bodies untouched", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, { patterns: [/secret/g] });

		await proxy.write({
			kind: "attachment",
			timestamp: 0,
			scopeId: null,
			mediaType: "text/plain",
			body: "contains secret data",
		});
		await proxy.write({
			kind: "attachment",
			timestamp: 1,
			scopeId: null,
			mediaType: "application/octet-stream",
			body: "secret",
		});

		expect(inner.events[0]).toMatchObject({ body: "contains [redacted] data" });
		expect(inner.events[1]).toMatchObject({ body: "secret" });
	});

	test("redacts matches of a pattern in a diagnostic's message and attributes", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, {
			patterns: [/sk-[a-z0-9]+/g],
		});

		await proxy.write({
			kind: "diagnostic",
			timestamp: 0,
			scopeId: null,
			severity: "warning",
			message: "leaked key sk-abc123",
			attributes: { hint: "sk-abc123" },
		});

		expect(inner.events[0]).toMatchObject({
			message: "leaked key [redacted]",
			attributes: { hint: "[redacted]" },
		});
	});

	test("uses a custom replacement string", async () => {
		const inner = new MemorySink<never>();
		const proxy = createRedactionProxy(inner, {
			patterns: [/token/g],
			replacement: "***",
		});

		await proxy.write({
			kind: "output",
			timestamp: 0,
			scopeId: null,
			stream: "stdout",
			chunk: "token leaked",
		});

		expect(inner.events[0]).toMatchObject({ chunk: "*** leaked" });
	});

	test("leaves non-attribute-bearing events untouched", async () => {
		const inner = new MemorySink<number>();
		const proxy = createRedactionProxy<number>(inner, { patterns: [/x/g] });

		await proxy.write({ kind: "data", timestamp: 0, scopeId: null, data: 42 });

		expect(inner.events[0]).toEqual({
			kind: "data",
			timestamp: 0,
			scopeId: null,
			data: 42,
		});
	});
});
