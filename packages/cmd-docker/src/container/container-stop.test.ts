import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContainerStop } from "./container-stop.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContainerStop", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	test("stops a single container", async () => {
		await dockerContainerStop(["my-container"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container stop 'my-container'",
		);
	});

	test("stops multiple containers", async () => {
		await dockerContainerStop(["container-a", "container-b"]);

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container stop 'container-a' 'container-b'",
		);
	});

	test("sets --time", async () => {
		await dockerContainerStop(["my-container"], { time: 5 });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container stop --time 5 'my-container'",
		);
	});
});
