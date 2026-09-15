import { expect, suite, test } from "vitest";

import type { ISink } from "../sink.js";
import { MemorySink } from "../sink/memory-sink.js";
import { openScope } from "./open-scope.js";

suite("openScope", () => {
	test("emits scope-start immediately and scope-end on disposal", async () => {
		const sink = new MemorySink<never>();

		{
			await using scope = openScope(sink, null, "build");
			void scope;
		}

		const kinds = sink.events.map((event) => event.kind);
		expect(kinds).toEqual(["scope-start", "scope-end"]);
		expect(sink.events[0]).toMatchObject({
			title: "build",
			key: "build",
			parentId: null,
		});
		expect(sink.events[1]).toMatchObject({ status: "ok" });
	});

	test("nests under the given parent scope id", async () => {
		const sink = new MemorySink<never>();

		await using scope = openScope(sink, "parent-id", "child");
		void scope;

		expect(sink.events[0]).toMatchObject({ parentId: "parent-id" });
		expect(sink.events[0]?.scopeId).not.toBe("parent-id");
	});

	test("key defaults to title, and can be overridden", async () => {
		const sink = new MemorySink<never>();

		{
			await using scope = openScope(sink, null, "run #12", { key: "run" });
			void scope;
		}

		expect(sink.events[0]).toMatchObject({ title: "run #12", key: "run" });
	});

	test("fail() resolves the scope as failed with the given error", async () => {
		const sink = new MemorySink<never>();
		const error = new Error("boom");

		{
			await using scope = openScope(sink, null, "build");
			scope.fail(error);
		}

		expect(sink.events[1]).toMatchObject({ status: "failed", error });
	});

	test("skip() resolves the scope as skipped", async () => {
		const sink = new MemorySink<never>();

		{
			await using scope = openScope(sink, null, "build");
			scope.skip();
		}

		expect(sink.events[1]).toMatchObject({ status: "skipped" });
	});

	test("resolves as cancelled when disposed under an aborted signal with no explicit fail/skip", async () => {
		const sink = new MemorySink<never>();
		const controller = new AbortController();
		controller.abort();

		{
			await using scope = openScope(sink, null, "build", {
				signal: controller.signal,
			});
			void scope;
		}

		expect(sink.events[1]).toMatchObject({ status: "cancelled" });
	});

	test("progress() emits a scope-progress event", async () => {
		const sink = new MemorySink<never>();

		await using scope = openScope(sink, null, "build", { total: 3 });
		scope.progress(1, 3, "halfway");

		const progress = sink.events.find(
			(event) => event.kind === "scope-progress",
		);
		expect(progress).toMatchObject({
			completed: 1,
			total: 3,
			message: "halfway",
		});
	});

	test("heartbeat()/data()/attach()/output()/attributes()/diagnostic() each emit their event kind", async () => {
		const sink = new MemorySink<number>();

		{
			await using scope = openScope(sink, null, "build");
			scope.heartbeat(500, "still going");
			scope.data(42);
			scope.attach("body", "text/plain", "note.txt");
			scope.output("stdout", "hello\n");
			scope.attributes({ tag: "x" });
			scope.diagnostic({ severity: "warning", message: "high variance" });
		}

		const [, heartbeat, data, attachment, output, attributes, diagnostic] =
			sink.events;
		expect(heartbeat).toMatchObject({
			kind: "scope-heartbeat",
			elapsedMs: 500,
			message: "still going",
		});
		expect(data).toMatchObject({ kind: "data", data: 42 });
		expect(attachment).toMatchObject({
			kind: "attachment",
			name: "note.txt",
			mediaType: "text/plain",
			body: "body",
		});
		expect(output).toMatchObject({
			kind: "output",
			stream: "stdout",
			chunk: "hello\n",
		});
		expect(attributes).toMatchObject({
			kind: "scope-attributes",
			attributes: { tag: "x" },
		});
		expect(diagnostic).toMatchObject({
			kind: "diagnostic",
			severity: "warning",
			message: "high variance",
		});
	});

	test("child() nests under this scope and shares its write order", async () => {
		const sink = new MemorySink<number>();

		const scope = openScope(sink, null, "suite");
		const child = scope.child("case");
		child.data(1);
		await child[Symbol.asyncDispose]();
		await scope[Symbol.asyncDispose]();

		expect(sink.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"scope-start",
			"data",
			"scope-end",
			"scope-end",
		]);
		const [suiteStart, caseStart] = sink.events;
		expect(caseStart).toMatchObject({ parentId: suiteStart?.scopeId });
	});

	test("started resolves once scope-start has been accepted by the writer", async () => {
		const sink = new MemorySink<never>();

		await using scope = openScope(sink, null, "build");

		await expect(scope.started).resolves.toBeUndefined();
	});

	test("started rejects with the write failure", async () => {
		const error = new Error("sink is down");
		const failing: ISink<never> = {
			write: () => {
				throw error;
			},
			flush: () => {},
			close: () => {},
		};

		const scope = openScope(failing, null, "build");

		await expect(scope.started).rejects.toBe(error);
	});

	test("onWriteError is called for a failing write, and disposal does not throw", async () => {
		const errors: unknown[] = [];
		let callCount = 0;
		const sink: ISink<number> = {
			write: () => {
				callCount += 1;
				if (callCount === 2) {
					throw new Error("boom");
				}
			},
			flush: () => {},
			close: () => {},
		};

		const scope = openScope(sink, null, "build", {
			onWriteError: (writeError) => errors.push(writeError),
		});
		scope.data(1);

		await expect(scope[Symbol.asyncDispose]()).resolves.toBeUndefined();
		expect(errors).toHaveLength(1);
		expect((errors[0] as Error).message).toBe("boom");
	});

	test("without onWriteError, a failing write is thrown from disposal as an AggregateError", async () => {
		let callCount = 0;
		const sink: ISink<number> = {
			write: () => {
				callCount += 1;
				if (callCount === 2) {
					throw new Error("boom");
				}
			},
			flush: () => {},
			close: () => {},
		};

		const scope = openScope(sink, null, "build");
		scope.data(1);

		await expect(scope[Symbol.asyncDispose]()).rejects.toThrow(AggregateError);
	});

	test("swallows a synchronous write failure without throwing during construction", async () => {
		const failing: ISink<never> = {
			write: () => {
				throw new Error("sink is down");
			},
			flush: () => {},
			close: () => {},
		};

		let scope: ReturnType<typeof openScope<never>> | undefined;
		expect(() => {
			scope = openScope(failing, null, "build");
		}).not.toThrow();

		await expect(scope?.[Symbol.asyncDispose]()).rejects.toThrow(
			AggregateError,
		);
	});

	test("disposing twice only emits one scope-end", async () => {
		const sink = new MemorySink<never>();
		const scope = openScope(sink, null, "build");

		await scope[Symbol.asyncDispose]();
		await scope[Symbol.asyncDispose]();

		expect(
			sink.events.filter((event) => event.kind === "scope-end"),
		).toHaveLength(1);
	});
});
