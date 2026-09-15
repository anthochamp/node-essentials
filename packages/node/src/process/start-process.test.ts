import { expect, suite, test, vi } from "vitest";

import { startProcess } from "./start-process.js";

const PRINTS_TWO_LINES = "console.log('one'); console.log('two');";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
	const decoder = new TextDecoder();
	let text = "";
	for await (const chunk of stream) {
		text += decoder.decode(chunk, { stream: true });
	}
	return text + decoder.decode();
}

suite("startProcess", () => {
	test("resolves once the child is running and exposes its pid", async () => {
		await using child = await startProcess(process.execPath, ["-e", ""]);

		expect(child.pid).toBeTypeOf("number");
		expect(child.pid).toBeGreaterThan(0);
	});

	test("rejects when the command cannot be spawned", async () => {
		await expect(
			startProcess("this-binary-does-not-exist-anywhere"),
		).rejects.toThrow();
	});

	test("exposes stdout as a Web stream", async () => {
		const child = await startProcess(process.execPath, [
			"-e",
			PRINTS_TWO_LINES,
		]);

		await expect(readAll(child.stdout!)).resolves.toBe("one\ntwo\n");
	});

	test("answers null for a stream that was not piped", async () => {
		await using child = await startProcess(process.execPath, ["-e", ""], {
			stderr: "ignore",
		});

		expect(child.stderr).toBeNull();
	});

	test("feeds the stream and the output events at the same time", async () => {
		const onOutput = vi.fn();
		const child = await startProcess(
			process.execPath,
			["-e", PRINTS_TWO_LINES],
			{ onOutput },
		);

		const [text] = await Promise.all([
			readAll(child.stdout!),
			child.waitForExit(),
		]);

		expect(text).toBe("one\ntwo\n");
		expect(onOutput).toHaveBeenCalledTimes(2);
		expect(onOutput).toHaveBeenNthCalledWith(1, "stdout", "one");
		expect(onOutput).toHaveBeenNthCalledWith(2, "stdout", "two");
	});

	test("hands out the same stream object on repeated reads", async () => {
		await using child = await startProcess(process.execPath, ["-e", ""]);

		expect(child.stdout).toBe(child.stdout);
	});

	test("runs a command line through the shell when asked", async () => {
		const child = await startProcess("echo shelled", undefined, {
			shell: true,
		});

		await expect(readAll(child.stdout!)).resolves.toBe("shelled\n");
	});
});
