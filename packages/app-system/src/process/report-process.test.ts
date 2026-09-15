import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { MemorySink, type ReportEvent } from "@ac-kit/app-report";
import { forkProcess, ProcessExitWithOutputError } from "@ac-kit/node";
import { expect, suite, test } from "vitest";

import { reportProcessOutput, spawnReportedProcess } from "./report-process.js";

const CHILD = fileURLToPath(
	new URL("./__fixtures__/fork-child.ts", import.meta.url),
);

function outputLines(
	events: readonly ReportEvent<never>[],
): { stream: string; chunk: string }[] {
	return events
		.filter((event) => event.kind === "output")
		.map((event) => ({ stream: event.stream, chunk: event.chunk }));
}

suite("spawnReportedProcess", () => {
	test("streams stdout/stderr line-by-line, wrapped in a scope", async () => {
		const sink = new MemorySink<never>();

		await spawnReportedProcess(
			process.execPath,
			[
				"-e",
				"console.log('line one'); console.log('line two'); console.error('oops');",
			],
			{ sink, title: "my step" },
		);

		expect(sink.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"output",
			"output",
			"output",
			"scope-end",
		]);
		expect(sink.events[0]).toMatchObject({ title: "my step" });
		expect(outputLines(sink.events)).toEqual([
			{ stream: "stdout", chunk: "line one" },
			{ stream: "stdout", chunk: "line two" },
			{ stream: "stderr", chunk: "oops" },
		]);
	});

	test("scope-end status reflects the exit code", async () => {
		const sink = new MemorySink<never>();

		await spawnReportedProcess(process.execPath, ["-e", "process.exit(1)"], {
			sink,
			throwOnNonZero: false,
		});

		expect(sink.events.at(-1)).toMatchObject({
			kind: "scope-end",
			status: "failed",
		});
	});

	test("carries the exit code and signal on scope-end", async () => {
		const sink = new MemorySink<never>();

		await spawnReportedProcess(process.execPath, ["-e", ""], { sink });

		expect(sink.events.at(-1)).toMatchObject({
			kind: "scope-end",
			status: "ok",
			attributes: { "process.exitCode": 0, "process.signal": null },
		});
	});

	test("closes the scope before rethrowing a non-zero exit", async () => {
		const sink = new MemorySink<never>();

		await expect(
			spawnReportedProcess(process.execPath, ["-e", "process.exit(2)"], {
				sink,
			}),
		).rejects.toThrow(ProcessExitWithOutputError);

		expect(sink.events.at(-1)).toMatchObject({
			kind: "scope-end",
			status: "failed",
			attributes: { "process.exitCode": 2 },
		});
	});

	test("nests under a parent scope when given one", async () => {
		const sink = new MemorySink<never>();

		await spawnReportedProcess(process.execPath, ["-e", ""], {
			sink,
			parentScopeId: "outer",
		});

		expect(sink.events[0]).toMatchObject({ parentId: "outer" });
	});
});

suite("reportProcessOutput", () => {
	test("writes a forked child's output under an open scope", async () => {
		const sink = new MemorySink<never>();
		const forked = await forkProcess(CHILD, {
			args: ["print"],
			execArgv: ["--import", "tsx"],
			// `tsx` resolves from the child's cwd, which must own the dependency.
			cwd: dirname(CHILD),
			stdout: "pipe",
			stderr: "pipe",
		});

		await reportProcessOutput(forked, sink, "suite-7");

		expect(outputLines(sink.events)).toEqual([
			{ stream: "stdout", chunk: "first out" },
			{ stream: "stdout", chunk: "second out" },
			{ stream: "stderr", chunk: "an error" },
		]);
		expect(sink.events.every((event) => event.scopeId === "suite-7")).toBe(
			true,
		);
	});
});
