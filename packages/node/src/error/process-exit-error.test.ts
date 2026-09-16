import { describe, expect, it } from "vitest";

import { ProcessExitWithOutputError } from "./process-exit-error.js";

describe("ProcessExitWithOutputError", () => {
	it("includes stderr in the message and retains complete output", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			"build progress",
			"build failed",
		);

		expect(error.message).toBe(
			"Process exited with code 1\n\nstderr:\nbuild failed",
		);
		expect(error.stdout).toBe("build progress");
		expect(error.stderr).toBe("build failed");
	});

	it("includes stdout when stderr is empty", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			Buffer.from("command failed"),
			Buffer.alloc(0),
		);

		expect(error.message).toBe(
			"Process exited with code 1\n\nstdout:\ncommand failed",
		);
	});

	it("includes stdout when stderr holds only whitespace", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			"command failed",
			"\n \t\n",
		);

		expect(error.message).toBe(
			"Process exited with code 1\n\nstdout:\ncommand failed",
		);
	});

	it("keeps only the tail of a string longer than the limit", () => {
		const error = new ProcessExitWithOutputError(1, null, false, "", "abcdef", {
			maxOutputLength: 4,
		});

		expect(error.message).toBe(
			"Process exited with code 1\n\nstderr (last 4 of 6 characters):\ncdef",
		);
	});

	it("keeps only the tail of a buffer longer than the limit", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			Buffer.alloc(0),
			Buffer.from("abcdef"),
			{ maxOutputLength: 4 },
		);

		expect(error.message).toBe(
			"Process exited with code 1\n\nstderr (last 4 of 6 bytes):\ncdef",
		);
	});

	it("cuts a buffer on a UTF-8 boundary rather than mid-sequence", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			Buffer.alloc(0),
			Buffer.from("aé€"), // 1 + 2 + 3 bytes
			{ maxOutputLength: 4 },
		);

		expect(error.message).toBe(
			"Process exited with code 1\n\nstderr (last 3 of 6 bytes):\n€",
		);
	});

	it("keeps the last 32 Ki characters by default", () => {
		const retainedOutput = "b".repeat(32 * 1024);
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			"",
			`omitted${retainedOutput}`,
		);

		expect(error.message).toBe(
			`Process exited with code 1\n\nstderr (last 32768 of 32775 characters):\n${retainedOutput}`,
		);
	});

	it("leaves the message untouched when both streams are empty", () => {
		const error = new ProcessExitWithOutputError(null, "SIGKILL", true, "", "");

		expect(error.message).toBe("Process exited with signal SIGKILL (killed)");
	});

	it("does not prepend blank lines when the exit status is unknown", () => {
		const error = new ProcessExitWithOutputError(
			null,
			null,
			false,
			"",
			"build failed",
		);

		expect(error.message).toBe("stderr:\nbuild failed");
	});

	it("exposes the appended output through the stack", () => {
		const error = new ProcessExitWithOutputError(
			1,
			null,
			false,
			"",
			"build failed",
		);

		expect(error.stack).toContain("stderr:\nbuild failed");
	});
});
