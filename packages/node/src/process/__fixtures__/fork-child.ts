/**
 * Fixture child for `fork-process.test.ts`. Modes: `echo` (default) replies to
 * every message, `stubborn` additionally ignores `SIGTERM` so only `SIGKILL`
 * ends it, `print` writes to both output streams and disconnects.
 */

const mode = process.argv[2] ?? "echo";

if (mode === "stubborn") {
	process.on("SIGTERM", () => {});
}

if (mode === "print") {
	process.stdout.write("first out\nsecond out\n");
	process.stderr.write("an error\n");
	// Not `process.exit()`: that would truncate the still-draining pipes.
	process.disconnect?.();
} else {
	process.on("message", (message: unknown) => {
		const request = message as {
			readonly t?: string;
			readonly value?: unknown;
		};

		if (request.t === "exit") {
			process.exit(typeof request.value === "number" ? request.value : 0);
		}

		process.send?.({ t: "echo", value: request.value });
	});
}
