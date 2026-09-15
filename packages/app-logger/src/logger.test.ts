import type { ReportEvent } from "@ac-kit/app-report";
import { MemorySink } from "@ac-kit/app-report";
import { expect, suite, test } from "vitest";

import type { LogRecord } from "./log-record.js";
import { Logger } from "./logger.js";

function dataEvents(
	events: readonly ReportEvent<LogRecord>[],
): { scopeId: string | null; record: LogRecord }[] {
	return events
		.filter((event) => event.kind === "data")
		.map((event) => ({ scopeId: event.scopeId, record: event.data }));
}

suite("Logger", () => {
	test("writes a record for each level method", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { minLevel: "debug" });

		logger.debug("a debug message");
		logger.info("an info message");
		logger.warn("a warn message");
		logger.error("an error message");
		logger.fatal("a fatal message");
		await logger.flush();

		expect(dataEvents(sink.events).map(({ record }) => record)).toEqual([
			{ level: "debug", message: "a debug message" },
			{ level: "info", message: "an info message" },
			{ level: "warn", message: "a warn message" },
			{ level: "error", message: "an error message" },
			{ level: "fatal", message: "a fatal message" },
		]);
	});

	test("filters out anything less severe than minLevel", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { minLevel: "warn" });

		logger.debug("dropped");
		logger.info("dropped");
		logger.warn("kept");
		await logger.flush();

		expect(dataEvents(sink.events).map(({ record }) => record.message)).toEqual(
			["kept"],
		);
	});

	test("defaults minLevel to info", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		logger.debug("dropped");
		logger.info("kept");
		await logger.flush();

		expect(dataEvents(sink.events).map(({ record }) => record.message)).toEqual(
			["kept"],
		);
	});

	test("attaches error and attributes from LogCallOptions", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);
		const error = new Error("boom");

		logger.error("failed", { error, attributes: { code: 42 } });
		await logger.flush();

		expect(dataEvents(sink.events)[0]?.record).toEqual({
			level: "error",
			message: "failed",
			error,
			attributes: { code: 42 },
		});
	});

	test("with() merges attributes onto every subsequent record without opening a scope", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { attributes: { service: "api" } });
		const requestLogger = logger.with({ requestId: "r1" });

		requestLogger.info("handled");
		await logger.flush();

		const [event] = dataEvents(sink.events);
		expect(event?.record.attributes).toEqual({
			service: "api",
			requestId: "r1",
		});
		expect(event?.scopeId).toBeNull();
	});

	test("captureStackAtOrBelow captures a stack trace for that level and anything more severe", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, {
			minLevel: "debug",
			captureStackAtOrBelow: "warn",
		});

		logger.info("no stack");
		logger.warn("has stack");
		logger.error("has stack too");
		await logger.flush();

		const records = dataEvents(sink.events).map(({ record }) => record);
		expect(records[0]?.stackTrace).toBeUndefined();
		expect(records[1]?.stackTrace?.length).toBeGreaterThan(0);
		expect(records[2]?.stackTrace?.length).toBeGreaterThan(0);
	});

	test("onSinkError surfaces a write failure instead of throwing or rejecting", async () => {
		const errors: unknown[] = [];
		const failing = {
			write: () => {
				throw new Error("sink is down");
			},
			flush: () => {},
			close: () => {},
		};
		const logger = new Logger(failing, {
			onSinkError: (error) => errors.push(error),
		});

		expect(() => logger.info("hello")).not.toThrow();
		await logger.flush();

		expect(errors).toHaveLength(1);
		expect((errors[0] as Error).message).toBe("sink is down");
	});
});

suite("Logger scopes", () => {
	test("scope() emits scope-start immediately and scope-end on disposal", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		{
			await using step = logger.scope("build");
			step.info("building");
		}
		await logger.flush();

		const kinds = sink.events.map((event) => event.kind);
		expect(kinds).toEqual(["scope-start", "data", "scope-end"]);

		const scopeStart = sink.events[0];
		const scopeEnd = sink.events[2];
		expect(scopeStart).toMatchObject({
			kind: "scope-start",
			parentId: null,
			title: "build",
			key: "build",
		});
		expect(scopeEnd).toMatchObject({ kind: "scope-end", status: "ok" });
	});

	test("log calls made through a scope carry that scope's id", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		await using step = logger.scope("build");
		step.info("building");
		await logger.flush();

		const scopeStart = sink.events.find(
			(event) => event.kind === "scope-start",
		);
		const data = dataEvents(sink.events)[0];
		expect(data?.scopeId).toBe(scopeStart?.scopeId);
	});

	test("nested scopes chain parentId correctly", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		{
			await using outer = logger.scope("outer");
			{
				await using inner = outer.scope("inner");
				inner.info("nested");
			}
		}
		await logger.flush();

		const starts = sink.events.filter((event) => event.kind === "scope-start");
		const outerStart = starts.find((event) => event.title === "outer")!;
		const innerStart = starts.find((event) => event.title === "inner")!;
		expect(innerStart).toMatchObject({ parentId: outerStart.scopeId });
	});

	test("fail() resolves the scope as failed with the given error on disposal", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);
		const error = new Error("build failed");

		{
			await using step = logger.scope("build");
			step.fail(error);
		}
		await logger.flush();

		const scopeEnd = sink.events.find((event) => event.kind === "scope-end");
		expect(scopeEnd).toMatchObject({ status: "failed", error });
	});

	test("skip() resolves the scope as skipped on disposal", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		{
			await using step = logger.scope("build");
			step.skip();
		}
		await logger.flush();

		const scopeEnd = sink.events.find((event) => event.kind === "scope-end");
		expect(scopeEnd).toMatchObject({ status: "skipped" });
	});

	test("resolves as cancelled when disposed with an aborted signal and no explicit fail/skip", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);
		const controller = new AbortController();
		controller.abort();

		{
			await using step = logger.scope("build", { signal: controller.signal });
			void step;
		}
		await logger.flush();

		const scopeEnd = sink.events.find((event) => event.kind === "scope-end");
		expect(scopeEnd).toMatchObject({ status: "cancelled" });
	});

	test("progress() emits a scope-progress event for the scope", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		{
			await using step = logger.scope("build", { total: 3 });
			step.progress(1, 3, "halfway");
		}
		await logger.flush();

		const progress = sink.events.find(
			(event) => event.kind === "scope-progress",
		);
		expect(progress).toMatchObject({
			completed: 1,
			total: 3,
			message: "halfway",
		});
	});

	test("key defaults to title, and can be overridden", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink);

		{
			await using step = logger.scope("run #12", { key: "run" });
			void step;
		}
		await logger.flush();

		const start = sink.events.find((event) => event.kind === "scope-start");
		expect(start).toMatchObject({ title: "run #12", key: "run" });
	});
});
