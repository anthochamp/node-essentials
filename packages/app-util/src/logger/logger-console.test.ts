import { afterEach } from "node:test";
import { beforeEach, expect, suite, test, vi } from "vitest";
import { mock, mockClear } from "vitest-mock-extended";
import { LoggerConsole } from "./logger-console.js";
import type { ILoggerPrinter } from "./logger-printer.js";

suite("LoggerConsole", () => {
	const printerMock = mock<ILoggerPrinter>();

	beforeEach(() => {
		mockClear(printerMock);
	});

	suite("logging", () => {
		test("should call the printer when using console methods", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.log("Test log message");
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: "Test log message",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should call the printer with the correct log level", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.error("Error message");
			loggerConsole.warn("Warning message");
			loggerConsole.info("Info message");
			loggerConsole.debug("Debug message");
			expect(printerMock.print).toHaveBeenCalledTimes(4);
			expect(printerMock.print).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					logLevel: "error",
					message: "Error message",
				}),
			);
			expect(printerMock.print).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					logLevel: "warn",
					message: "Warning message",
				}),
			);
			expect(printerMock.print).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({ logLevel: "info", message: "Info message" }),
			);
			expect(printerMock.print).toHaveBeenNthCalledWith(
				4,
				expect.objectContaining({
					logLevel: "debug",
					message: "Debug message",
				}),
			);
		});

		test("should handle trace calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.trace("Trace message");
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: expect.stringContaining("Trace: Trace message\n"),
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should handle assert calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.assert(false, "Test failed: %s", "value is false");
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "error",
				message: "Assertion failed: Test failed: value is false",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should handle table calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			const data = [
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
			];
			loggerConsole.table(data);
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: "name    | age\n------- | ---\n'Alice' | 30 \n'Bob'   | 25 ",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should handle dir calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			const obj = { name: "Alice", age: 30 };
			loggerConsole.dir(obj, { depth: 1 });
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: "{ name: 'Alice', age: 30 }",
				metadata: { data: obj },

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should handle dirxml calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			const obj = { name: "Alice", age: 30 };
			loggerConsole.dirxml(obj, { depth: 1 });
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: "{ name: 'Alice', age: 30 } { depth: 1 }",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should clear the console", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.clear();
			expect(printerMock.clear).toHaveBeenCalledTimes(1);
		});
	});

	suite("counting", () => {
		test("should handle count and countReset calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.count("myLabel");
			loggerConsole.count("myLabel");
			loggerConsole.countReset("myLabel");
			loggerConsole.count("myLabel");
			expect(printerMock.print).toHaveBeenCalledTimes(3);
			expect(printerMock.print).toHaveBeenNthCalledWith(1, {
				logLevel: "info",
				message: "myLabel: 1",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
			expect(printerMock.print).toHaveBeenNthCalledWith(2, {
				logLevel: "info",
				message: "myLabel: 2",

				stackTrace: null,
				metadata: {},
				timestamp: expect.any(Number),
			});
			expect(printerMock.print).toHaveBeenNthCalledWith(3, {
				logLevel: "info",
				message: "myLabel: 1",

				stackTrace: null,
				metadata: {},
				timestamp: expect.any(Number),
			});
		});
	});

	suite("grouping", () => {
		test("should handle group and groupEnd calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.group("My Group");
			loggerConsole.log("Inside group");
			loggerConsole.groupEnd();
			expect(printerMock.print).toHaveBeenCalledTimes(3);
			expect(printerMock.print).toHaveBeenNthCalledWith(1, {
				message: "start of My Group (expanded)",
				logLevel: null,
				stackTrace: null,
				metadata: {},
				timestamp: expect.any(Number),
			});
			expect(printerMock.print).toHaveBeenNthCalledWith(2, {
				logLevel: "debug",
				message: "[My Group] Inside group",
				metadata: {},
				stackTrace: null,
				timestamp: expect.any(Number),
			});
			expect(printerMock.print).toHaveBeenNthCalledWith(3, {
				message: "end of My Group",
				logLevel: null,
				stackTrace: null,
				metadata: {},
				timestamp: expect.any(Number),
			});
		});
	});

	suite("timing", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test("should handle time and timeEnd calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.time("myTimer");
			vi.advanceTimersByTime(5100);
			loggerConsole.timeEnd("myTimer");
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenNthCalledWith(1, {
				logLevel: "info",
				message: expect.stringMatching(/^myTimer: 5s 100ms$/),
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});

		test("should handle timeLog calls", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.time("myTimer");
			vi.advanceTimersByTime(300);
			loggerConsole.timeLog("myTimer", "First log");
			vi.advanceTimersByTime(200);
			loggerConsole.timeLog("myTimer", "Second log");
			expect(printerMock.print).toHaveBeenCalledTimes(2);
			expect(printerMock.print).toHaveBeenNthCalledWith(1, {
				logLevel: "debug",
				message: expect.stringMatching(/^myTimer: 300ms First log$/),
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
			expect(printerMock.print).toHaveBeenNthCalledWith(2, {
				logLevel: "debug",
				message: expect.stringMatching(/^myTimer: 500ms Second log$/),
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});
	});

	suite("formatter", () => {
		test("should call handle log with format specifiers", () => {
			const loggerConsole = new LoggerConsole([printerMock]);
			loggerConsole.log("Hello %s, you have %d new messages", "Alice", 5);
			expect(printerMock.print).toHaveBeenCalledTimes(1);
			expect(printerMock.print).toHaveBeenCalledWith({
				logLevel: "debug",
				message: "Hello Alice, you have 5 new messages",
				metadata: {},

				stackTrace: null,
				timestamp: expect.any(Number),
			});
		});
	});
});
