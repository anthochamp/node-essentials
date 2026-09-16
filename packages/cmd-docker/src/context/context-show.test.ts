import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContextShow } from "./context-show.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContextShow", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("returns the active context without Docker's trailing newline", async () => {
		execAsyncMock.mockResolvedValue({ stdout: "default\n", stderr: "" });

		const context = await dockerContextShow();

		expect(context).toBe("default");
		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith("docker context show", {
			encoding: "utf8",
		});
	});

	test("puts --context before the subcommand", async () => {
		await dockerContextShow({ context: "remote" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' context show",
			{ encoding: "utf8" },
		);
	});
});
