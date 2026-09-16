import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContextUse } from "./context-use.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContextUse", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("switches the active context", async () => {
		await dockerContextUse("remote");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith("docker context use 'remote'", {
			encoding: "utf8",
		});
	});

	test("escapes the context name", async () => {
		await dockerContextUse("weird name");

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker context use 'weird name'",
			{ encoding: "utf8" },
		);
	});
});
