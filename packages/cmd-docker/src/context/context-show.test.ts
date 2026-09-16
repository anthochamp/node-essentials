import { execAsync } from "@ac-kit/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dockerContextShow } from "./context-show.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

describe("dockerContextShow", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	it("returns the active context without Docker's trailing newline", async () => {
		execAsyncMock.mockResolvedValue({ stdout: "default\n", stderr: "" });

		const context = await dockerContextShow();

		expect(context).toBe("default");
		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith("docker context show", {
			encoding: "utf8",
		});
	});
});
