import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { ProcessExitError } from "./process-exit-error.js";
import { shellExec } from "./shell-exec.js";

class WritableMock extends Writable {
	constructor(
		private readonly onWrite: (
			chunk: string | Buffer,
			encoding: BufferEncoding,
		) => void,
	) {
		super();
	}

	override _write(
		chunk: string | Buffer,
		encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		this.onWrite(chunk, encoding);
		callback();
	}
}

describe("shell-exec", () => {
	it("should execute a simple command successfully", async () => {
		await expect(shellExec("echo 'Hello, World!'")).resolves.toBeUndefined();
	});

	it("should handle a command that fails", async () => {
		await expect(shellExec("false")).rejects.toThrow(ProcessExitError);
	});

	describe("onStderrLine", () => {
		it("should not call onStderrLine for stdout output", async () => {
			const handleStderrLine = vi.fn();

			await expect(
				shellExec("echo 'Hello, World!'", {
					onStderrLine: handleStderrLine,
				}),
			).resolves.toBeUndefined();

			expect(handleStderrLine).not.toHaveBeenCalled();
		});

		it("should capture stderr output", async () => {
			const handleStderrLine = vi.fn();

			await expect(
				shellExec("echo 'Error message' 1>&2", {
					onStderrLine: handleStderrLine,
				}),
			).resolves.toBeUndefined();

			expect(handleStderrLine).toHaveBeenCalledOnce();
			expect(handleStderrLine).toHaveBeenCalledWith("Error message");
		});

		it("should capture multiple lines of stderr output", async () => {
			const handleStderrLine = vi.fn();

			await expect(
				shellExec(
					'node -e \'console.error("Line 1"); console.error("Line 2")\'',
					{
						onStderrLine: handleStderrLine,
					},
				),
			).resolves.toBeUndefined();

			expect(handleStderrLine).toHaveBeenCalledTimes(2);
			expect(handleStderrLine).toHaveBeenNthCalledWith(1, "Line 1");
			expect(handleStderrLine).toHaveBeenNthCalledWith(2, "Line 2");
		});
	});

	describe("outputStream", () => {
		it("should pipe stdout and stderr to a writable stream", async () => {
			const handleWrite = vi.fn();
			const writable = new WritableMock(handleWrite);
			await expect(
				shellExec(
					'node -e \'console.log("Output message"); console.error("Error message")\'',
					{
						outputStream: writable,
					},
				),
			).resolves.toBeUndefined();

			expect(handleWrite).toHaveBeenCalledTimes(2);
			expect(handleWrite).toHaveBeenNthCalledWith(
				1,
				Buffer.from("Output message\n"),
				expect.any(String),
			);
			expect(handleWrite).toHaveBeenNthCalledWith(
				2,
				Buffer.from("Error message\n"),
				expect.any(String),
			);
		});
	});

	describe("combined onStderrLine and outputStream", () => {
		it("should call onStderrLine and pipe to outputStream", async () => {
			const handleStderrLine = vi.fn();
			const handleWrite = vi.fn();
			const writable = new WritableMock(handleWrite);

			await expect(
				shellExec(
					'node -e \'console.log("Output message"); console.error("Error message")\'',
					{
						onStderrLine: handleStderrLine,
						outputStream: writable,
					},
				),
			).resolves.toBeUndefined();

			expect(handleStderrLine).toHaveBeenCalledOnce();
			expect(handleStderrLine).toHaveBeenCalledWith("Error message");

			expect(handleWrite).toHaveBeenCalledTimes(2);
			expect(handleWrite).toHaveBeenNthCalledWith(
				1,
				Buffer.from("Output message\n"),
				expect.any(String),
			);
			expect(handleWrite).toHaveBeenNthCalledWith(
				2,
				Buffer.from("Error message\n"),
				expect.any(String),
			);
		});
	});
});
