import type { ReportEvent } from "@ac-kit/app-report";
import { MemorySink } from "@ac-kit/app-report";
import { expect, suite, test } from "vitest";

import { ConsoleSink } from "./console-sink.js";
import type { LogRecord } from "./log-record.js";
import { Logger } from "./logger.js";

function dataMessages(events: readonly ReportEvent<LogRecord>[]): string[] {
	return events
		.filter((event) => event.kind === "data")
		.map((event) => event.data.message);
}

suite("ConsoleSink", () => {
	test("maps console methods onto the expected log level", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { minLevel: "debug" });
		const consoleSink = new ConsoleSink(logger);

		consoleSink.debug("d");
		consoleSink.log("l");
		consoleSink.info("i");
		consoleSink.warn("w");
		consoleSink.error("e");
		await logger.flush();

		const levels = sink.events
			.filter((event) => event.kind === "data")
			.map((event) => event.data.level);
		expect(levels).toEqual(["debug", "debug", "info", "warn", "error"]);
	});

	test("formats multiple arguments with util.formatWithOptions", async () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { minLevel: "debug" });
		const consoleSink = new ConsoleSink(logger);

		consoleSink.log("value:", 42);
		await logger.flush();

		expect(dataMessages(sink.events)).toEqual(["value: 42"]);
	});

	suite("assert", () => {
		test("does nothing when the condition is truthy", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.assert(true, "should not appear");
			await logger.flush();

			expect(dataMessages(sink.events)).toEqual([]);
		});

		test("logs an assertion failure when the condition is falsy", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.assert(false, "oops");
			await logger.flush();

			expect(dataMessages(sink.events)).toEqual(["Assertion failed: oops"]);
		});
	});

	suite("counting", () => {
		test("count() increments per label", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.count("hits");
			consoleSink.count("hits");
			await logger.flush();

			expect(dataMessages(sink.events)).toEqual(["hits: 1", "hits: 2"]);
		});

		test("countReset() resets the counter without logging when it exists", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.count("hits");
			consoleSink.countReset("hits");
			consoleSink.count("hits");
			await logger.flush();

			expect(dataMessages(sink.events)).toEqual(["hits: 1", "hits: 1"]);
		});
	});

	suite("grouping", () => {
		test("group()/groupEnd() open and close a Logger scope", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.group("phase 1");
			consoleSink.log("inside");
			consoleSink.groupEnd();
			await logger.flush();

			const kinds = sink.events.map((event) => event.kind);
			expect(kinds).toEqual(["scope-start", "data", "scope-end"]);
			expect(sink.events[0]).toMatchObject({ title: "phase 1" });

			const scopeStartId = sink.events[0]?.scopeId;
			const dataEvent = sink.events.find((event) => event.kind === "data");
			expect(dataEvent?.scopeId).toBe(scopeStartId);
		});

		test("nested groups produce nested scopes", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.group("outer");
			consoleSink.group("inner");
			consoleSink.groupEnd();
			consoleSink.groupEnd();
			await logger.flush();

			const starts = sink.events.filter(
				(event) => event.kind === "scope-start",
			);
			const outer = starts.find((event) => event.title === "outer")!;
			const inner = starts.find((event) => event.title === "inner")!;
			expect(inner).toMatchObject({ parentId: outer.scopeId });
		});

		test("clear() unwinds any open groups", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.group("phase 1");
			consoleSink.clear();
			await logger.flush();

			const kinds = sink.events.map((event) => event.kind);
			expect(kinds).toEqual(["scope-start", "scope-end"]);
		});
	});

	suite("table", () => {
		test("renders an array of records as a table", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.table([{ a: 1 }, { a: 2 }]);
			await logger.flush();

			const [message] = dataMessages(sink.events);
			expect(message).toContain("a");
			expect(message).toContain("1");
			expect(message).toContain("2");
		});

		test("renders (empty) for an empty array", async () => {
			const sink = new MemorySink<LogRecord>();
			const logger = new Logger(sink, { minLevel: "debug" });
			const consoleSink = new ConsoleSink(logger);

			consoleSink.table([]);
			await logger.flush();

			expect(dataMessages(sink.events)).toEqual(["(empty)"]);
		});
	});

	test("patchConsole copies every patchable method bound to the source", () => {
		const sink = new MemorySink<LogRecord>();
		const logger = new Logger(sink, { minLevel: "debug" });
		const consoleSink = new ConsoleSink(logger);
		const target = { log: () => {} } as unknown as Console;

		ConsoleSink.patchConsole(target, consoleSink);

		expect(typeof target.log).toBe("function");
		expect(() => target.log("hello")).not.toThrow();
	});
});
