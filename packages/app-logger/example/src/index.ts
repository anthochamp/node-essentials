import * as path from "node:path";

import {
	ansiLogFormatter,
	ConsoleSink,
	jsonLogFormatter,
	Logger,
	loggerOptionsFromEnv,
} from "@ac-kit/app-logger";
import {
	createFanOutSink,
	IdleMarkProxy,
	NoRepeatProxy,
	WritableStreamSink,
} from "@ac-kit/app-report";
import { nodeTerminal, RotatingFileSink } from "@ac-kit/app-system";
import { fromProcessEnv } from "@ac-kit/format-shell";
import { nonClosingWritableStream } from "@ac-kit/node";

import * as packageJson from "../package.json" with { type: "json" };

// 1. Render to stdout with ANSI colors. Never closes the underlying stream —
//    ending process.stdout hangs forever on a TTY.
const terminal = nodeTerminal(process.stdout);
const consoleSink = new WritableStreamSink(
	nonClosingWritableStream(process.stdout),
	{ formatter: ansiLogFormatter, terminal },
);

// 2. Render to a rotating, gzip-compressed NDJSON file.
const fileSink = new RotatingFileSink(
	path.join(import.meta.dirname, "app.log"),
	{ formatter: jsonLogFormatter(), useCompression: true },
);

// 3. Fan out to both, suppressing repeated messages (small thresholds here so
//    the demo below actually triggers it) and marking long idle stretches.
const sink = new IdleMarkProxy(
	new NoRepeatProxy(createFanOutSink([consoleSink, fileSink]), {
		maxCount: 5,
		maxDelayMs: 2000,
	}),
	{ idleDelayMs: 1000 },
);

// 4. Create the main Logger, with attributes shared by every record.
//    `minLevel: DEBUG` here so every console method below (mapped as low as
//    DEBUG) actually reaches the sinks; env-driven debug settings
//    (`DEBUG=1`) additionally turn on stack capture.
const logger = new Logger(sink, {
	minLevel: "debug",
	...loggerOptionsFromEnv(fromProcessEnv(process.env)),
	attributes: { package: packageJson.name },
});

// 5. Log uncaught exceptions and unhandled rejections.
process.on("uncaughtException", (error) => {
	logger.fatal("uncaught exception", { error });
});
process.on("unhandledRejection", (error) => {
	logger.fatal("unhandled rejection", { error });
});

// 6. Log various messages at different levels.
logger.debug("package info", { attributes: { packageJson } });
const error = new Error("This is a test error");
logger.fatal("This is a fatal message", { error });
logger.error("This is an error message", { error });
logger.warn("This is a warning message", { error });
logger.info("This is an info message");
logger.info("This is an info message with some attributes", {
	attributes: { foo: "bar", baz: 42 },
});

// 7. Scopes: structured, nestable units of work.
{
	await using build = logger.scope("build", { total: 2 });
	build.info("compiling");
	build.progress(1, 2);
	build.info("bundling");
	build.progress(2, 2);
}

{
	await using deploy = logger.scope("deploy");
	deploy.fail(new Error("upload failed"));
}

// 8. Demonstrate repeat suppression: the NoRepeatProxy above collapses these
//    into the first message plus a "repeated N time(s)" summary.
for (let i = 0; i < 8; i++) {
	logger.info("this is a repeatable info message");
}

// 9. Demonstrate the idle mark: nothing is logged for longer than
//    `idleDelayMs`, so the IdleMarkProxy above writes a "MARK" line (checked
//    on a 1s poll, so the wait comfortably clears one extra tick).
await new Promise((resolve) => setTimeout(resolve, 2500));

// 10. Patch the global console to route through the same logger. `clear`
//     bridges to the real terminal, since ConsoleSink itself has no path back
//     to one (its sink could just as well be a file or memory sink).
const globalConsoleSink = new ConsoleSink(logger, {
	clear: () => terminal.clear?.(),
});
ConsoleSink.patchConsole(console, globalConsoleSink);

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

// 11. Demonstrate clear(): erases the real terminal via terminal.clear() above.
await new Promise((resolve) => setTimeout(resolve, 1000));
console.clear();
console.log("Screen cleared by console.clear()");

// 12. Demonstrate error handling for unhandled rejections and uncaught exceptions.
void Promise.reject(new Error("This is a test unhandled rejection"));
setImmediate(() => {
	throw new Error("This is a test error");
});

// 13. Flush and close everything.
await logger.close();
