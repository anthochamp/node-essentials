import * as path from "node:path";
import {
	AnsiLoggerRecordStringifier,
	FilePrinter,
	IdleMarkPrinterProxy,
	Logger,
	LoggerConsole,
	LoggerLogLevel,
	NoRepeatPrinterProxy,
	TextStreamPrinter,
} from "@ac-essentials/app-util";
import { ErrorListeners } from "@ac-essentials/misc-util";
import * as packageJson from "../package.json" with { type: "json" };

const textStreamPrinter = new TextStreamPrinter(process.stdout, process.stderr);
const consoleNoRepeatPrinterProxy = new NoRepeatPrinterProxy(textStreamPrinter);
const consoleIdleMarkPrinterProxy = new IdleMarkPrinterProxy(
	consoleNoRepeatPrinterProxy,
);

const filePrinter = new FilePrinter(path.join(import.meta.dirname, "app.log"), {
	useCompression: true,
	recordStringifier: new AnsiLoggerRecordStringifier({
		dateTimeFormatOptions: null,
	}),
});

const logger = new Logger([consoleIdleMarkPrinterProxy, filePrinter], {
	minLogLevel: LoggerLogLevel.DEBUG,
	debugInspectOptions: {
		colors: true,
	},
});

const loggerConsole = new LoggerConsole(
	[consoleIdleMarkPrinterProxy, filePrinter],
	{ inspectOptions: { colors: true } },
);

new ErrorListeners(path.join(import.meta.dirname, "error.log"), {
	onUncaughtExceptionEventError: (err) => {
		logger.alert(err);
	},
	onUnhandledRejectionEventError: (err) => {
		logger.alert(err);
	},
}).attach();

const error = new Error("This is a test error");

logger.debug(packageJson, "Package info");

logger.emerg(error, "This is a fatal message");
logger.alert(error, "This is an alert message");
logger.critical(error, "This is a critical message");
logger.error(error, "This is an error message");
logger.warning(error, "This is a warning message");
logger.notice("This is a notice message");
logger.info("This is an info message");
logger.debug({}, "This is a debug message");

logger.info("This is an info message with some metadata", {
	foo: "bar",
	baz: 42,
});
logger.debug(
	{
		foo: "bar",
		baz: 42,
		error: new Error("This is a test error"),
	},
	"This is a debug message with some data",
);

// biome-ignore lint/nursery/noFloatingPromises: test
Promise.reject(new Error("This is a test unhandled rejection"));

setImmediate(() => {
	throw new Error("This is a test error");
});

logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
await new Promise((resolve) => setTimeout(resolve, 2000));
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
await new Promise((resolve) => setTimeout(resolve, 2000));
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.info("This is a repeatable info message");
logger.error("This is an error message");
for (let i = 0; i < 500; i++) {
	logger.info("This is a repeatable info message");
}
await new Promise((resolve) => setTimeout(resolve, 2000));
for (let i = 0; i < 30000; i++) {
	logger.info("This is a repeatable info message");
}
logger.info(
	"This is a debug message after a lot of repeatable info messages 1",
);
await new Promise((resolve) => setTimeout(resolve, 2000));
for (let i = 0; i < 30000; i++) {
	logger.info("This is a repeatable info message");
}
logger.info(
	"This is a debug message after a lot of repeatable info messages 2",
);

LoggerConsole.patchConsole(console, loggerConsole);

console.log("This is a console.log message");
console.info("This is a console.info message");
console.warn("This is a console.warn message");
console.error("This is a console.error message");
console.debug("This is a console.debug message");
console.trace("This is a console.trace message");
console.assert(true, "This is a console.assert(true) message");
console.assert(false, "This is a console.assert(false) message");
console.count("my-counter");
console.count("my-counter");
console.countReset("my-counter");
console.count("my-counter");
console.time("my-timer");
await new Promise((resolve) => setTimeout(resolve, 1000));
console.timeLog("my-timer");
console.timeEnd("my-timer");

console.table([
	{ foo: "bar", baz: 42 },
	{ foo: "bar2", baz: 43 },
	{ foo: "bar3", baz: 44 },
]);

console.group("my-group");
console.log("This is a message inside a group");
console.group("my-nested-group");
console.log("This is a message inside a nested group");
console.groupEnd();
console.log("This is a message inside a group");
console.groupEnd();

consoleIdleMarkPrinterProxy.close();
filePrinter.close();
