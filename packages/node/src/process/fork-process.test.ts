import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, suite, test, vi } from "vitest";

import { type ForkProcessOptions, forkProcess } from "./fork-process.js";

const CHILD = fileURLToPath(
	new URL("./__fixtures__/fork-child.ts", import.meta.url),
);

function fork(options?: ForkProcessOptions) {
	return forkProcess(CHILD, {
		execArgv: ["--import", "tsx"],
		// `tsx` resolves from the child's cwd, which must be this package.
		cwd: dirname(CHILD),
		...options,
	});
}

/** Resolves with the next `count` messages the child sends. */
function collectMessages(
	forked: Awaited<ReturnType<typeof fork>>,
	count: number,
): Promise<unknown[]> {
	return new Promise((resolve) => {
		const received: unknown[] = [];
		forked.subscribe("message", (message) => {
			received.push(message);
			if (received.length === count) {
				resolve(received);
			}
		});
	});
}

suite("forkProcess", () => {
	test("resolves only once the child has spawned, and exposes its pid", async () => {
		await using forked = await fork();

		expect(forked.pid).toBeTypeOf("number");
		expect(forked.pid).toBeGreaterThan(0);
	});

	test("rejects when the child cannot be spawned", async () => {
		await expect(
			fork({ cwd: "/this/directory/does/not/exist" }),
		).rejects.toThrow();
	});

	test("round-trips messages, preserving order", async () => {
		await using forked = await fork();
		const replies = collectMessages(forked, 3);

		await forked.send({ t: "echo", value: "one" });
		await forked.send({ t: "echo", value: "two" });
		await forked.send({ t: "echo", value: "three" });

		await expect(replies).resolves.toEqual([
			{ t: "echo", value: "one" },
			{ t: "echo", value: "two" },
			{ t: "echo", value: "three" },
		]);
	});

	test("advanced serialization carries values JSON would lose", async () => {
		await using forked = await fork();
		const replies = collectMessages(forked, 1);

		await forked.send({ t: "echo", value: new Uint8Array([1, 2, 3]) });

		expect(await replies).toEqual([
			{ t: "echo", value: new Uint8Array([1, 2, 3]) },
		]);
	});

	test("pre-subscribes onMessage before the child can send anything", async () => {
		const onMessage = vi.fn();
		await using forked = await fork({ onMessage });

		await forked.send({ t: "echo", value: "one" });
		await forked.wait("message");

		expect(onMessage).toHaveBeenCalledTimes(1);
		expect(onMessage).toHaveBeenCalledWith({ t: "echo", value: "one" });
	});

	test("waitForExit reports the child's own exit code", async () => {
		const forked = await fork();

		await forked.send({ t: "exit", value: 3 });
		const exit = await forked.waitForExit();

		expect(exit.code).toBe(3);
		expect(exit.signal).toBeNull();
		expect(exit.durationMs).toBeGreaterThanOrEqual(0);
	});

	test("waitForExit resolves immediately once the child has already exited", async () => {
		const forked = await fork();

		await forked.send({ t: "exit", value: 0 });
		const first = await forked.waitForExit();

		await expect(forked.waitForExit()).resolves.toBe(first);
	});

	test("waitForExit rejects on an already-aborted signal", async () => {
		await using forked = await fork();

		await expect(forked.waitForExit(AbortSignal.abort())).rejects.toThrow();
	});

	test("terminate stops a cooperative child with SIGTERM", async () => {
		const forked = await fork();

		const exit = await forked.terminate();

		expect(exit.signal).toBe("SIGTERM");
		expect(exit.code).toBeNull();
	});

	test("terminate escalates to SIGKILL when SIGTERM is ignored", async () => {
		const forked = await fork({ args: ["stubborn"] });

		// `forkProcess` resolves on spawn, not on readiness: signalling before the
		// module loads would hit the default SIGTERM handler, not the fixture's.
		const ready = collectMessages(forked, 1);
		await forked.send({ t: "echo", value: "ready" });
		await ready;

		const exit = await forked.terminate(50);

		expect(exit.signal).toBe("SIGKILL");
	});

	test("terminate is idempotent and shares one escalation", async () => {
		const forked = await fork();

		const [first, second] = await Promise.all([
			forked.terminate(),
			forked.terminate(),
		]);

		expect(second).toBe(first);
		await expect(forked.waitForExit()).resolves.toBe(first);
	});

	test("kill sends one signal without escalating", async () => {
		const forked = await fork();

		expect(forked.kill("SIGKILL")).toBe(true);
		await expect(forked.waitForExit()).resolves.toMatchObject({
			signal: "SIGKILL",
		});
	});

	test("aborting the signal terminates the child", async () => {
		const controller = new AbortController();
		const forked = await fork({ signal: controller.signal });

		controller.abort();
		const exit = await forked.waitForExit();

		expect(exit.signal).toBe("SIGTERM");
	});

	test("a signal already aborted terminates the child immediately", async () => {
		const forked = await fork({ signal: AbortSignal.abort() });

		await expect(forked.waitForExit()).resolves.toMatchObject({
			signal: "SIGTERM",
		});
	});

	test("send rejects once the channel has closed", async () => {
		const forked = await fork();

		await forked.terminate();
		await expect(forked.send({ t: "echo", value: "late" })).rejects.toThrow();
	});

	test("send rejects when its own signal is already aborted", async () => {
		await using forked = await fork();

		await expect(
			forked.send({ t: "echo", value: "x" }, AbortSignal.abort()),
		).rejects.toThrow();
	});

	test("emits piped stdout and stderr line by line", async () => {
		const onOutput = vi.fn();
		const forked = await fork({ args: ["print"], onOutput });

		await forked.waitForExit();

		expect(onOutput).toHaveBeenCalledTimes(3);
		expect(onOutput).toHaveBeenNthCalledWith(1, "stdout", "first out");
		expect(onOutput).toHaveBeenNthCalledWith(2, "stdout", "second out");
		expect(onOutput).toHaveBeenNthCalledWith(3, "stderr", "an error");
	});

	test("disposal terminates the child", async () => {
		const forked = await fork();
		const spy = vi.spyOn(forked, "terminate");

		await forked[Symbol.asyncDispose]();

		expect(spy).toHaveBeenCalledTimes(1);
		await expect(forked.waitForExit()).resolves.toMatchObject({
			signal: "SIGTERM",
		});
	});
});
