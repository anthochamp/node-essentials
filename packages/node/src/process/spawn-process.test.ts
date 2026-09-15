import { expect, suite, test, vi } from "vitest";

import { ProcessExitWithOutputError } from "../error/process-exit-error.js";
import { spawnProcess } from "./spawn-process.js";

suite("spawnProcess", () => {
	test("captures stdout and stderr, and reports exit code/signal", async () => {
		const result = await spawnProcess(process.execPath, [
			"-e",
			"process.stdout.write('out'); process.stderr.write('err');",
		]);

		expect(result.stdout).toBe("out");
		expect(result.stderr).toBe("err");
		expect(result.code).toBe(0);
		expect(result.signal).toBeNull();
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});

	test("respects capture: 'stdout' / 'stderr' / 'none'", async () => {
		const script = "process.stdout.write('out'); process.stderr.write('err');";

		const stdoutOnly = await spawnProcess(process.execPath, ["-e", script], {
			capture: "stdout",
		});
		expect(stdoutOnly.stdout).toBe("out");
		expect(stdoutOnly.stderr).toBe("");

		const stderrOnly = await spawnProcess(process.execPath, ["-e", script], {
			capture: "stderr",
		});
		expect(stderrOnly.stdout).toBe("");
		expect(stderrOnly.stderr).toBe("err");

		const none = await spawnProcess(process.execPath, ["-e", script], {
			capture: "none",
		});
		expect(none.stdout).toBe("");
		expect(none.stderr).toBe("");
	});

	test("runs in the given cwd", async () => {
		const result = await spawnProcess(
			process.execPath,
			["-e", "process.stdout.write(process.cwd())"],
			{ cwd: "/" },
		);

		expect(result.stdout).toBe("/");
	});

	test("runs with the given env", async () => {
		const result = await spawnProcess(
			process.execPath,
			["-e", "process.stdout.write(process.env.SPAWN_TEST_VAR ?? '')"],
			{ env: { ...process.env, SPAWN_TEST_VAR: "hello-env" } },
		);

		expect(result.stdout).toBe("hello-env");
	});

	test("writes input to stdin", async () => {
		const result = await spawnProcess(
			process.execPath,
			[
				"-e",
				"process.stdin.on('data', (chunk) => process.stdout.write(chunk));",
			],
			{ input: "piped input" },
		);

		expect(result.stdout).toBe("piped input");
	});

	test("runs a command line through the shell when asked", async () => {
		const result = await spawnProcess("echo shelled", undefined, {
			shell: true,
		});

		expect(result.stdout.trimEnd()).toBe("shelled");
	});

	test("streams output line by line to onOutput", async () => {
		const onOutput = vi.fn();

		await spawnProcess(
			process.execPath,
			[
				"-e",
				"console.log('line one'); console.log('line two'); console.error('oops');",
			],
			{ onOutput },
		);

		expect(onOutput).toHaveBeenCalledTimes(3);
		expect(onOutput).toHaveBeenNthCalledWith(1, "stdout", "line one");
		expect(onOutput).toHaveBeenNthCalledWith(2, "stdout", "line two");
		expect(onOutput).toHaveBeenNthCalledWith(3, "stderr", "oops");
	});

	test("throws ProcessExitWithOutputError on a non-zero exit by default", async () => {
		await expect(
			spawnProcess(process.execPath, ["-e", "process.exit(3)"]),
		).rejects.toThrow(ProcessExitWithOutputError);
	});

	test("does not throw on a non-zero exit when throwOnNonZero is false", async () => {
		const result = await spawnProcess(
			process.execPath,
			["-e", "process.exit(3)"],
			{ throwOnNonZero: false },
		);

		expect(result.code).toBe(3);
	});

	test("rejects when aborted via signal", async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			spawnProcess(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], {
				signal: controller.signal,
			}),
		).rejects.toThrow();
	});

	test("rejects when output exceeds maxBuffer", async () => {
		await expect(
			spawnProcess(
				process.execPath,
				["-e", "process.stdout.write('x'.repeat(1000))"],
				{ maxBuffer: 10 },
			),
		).rejects.toThrow(RangeError);
	});

	test("rejects when the command cannot be spawned at all", async () => {
		await expect(
			spawnProcess("this-binary-does-not-exist-anywhere", []),
		).rejects.toThrow();
	});
});
