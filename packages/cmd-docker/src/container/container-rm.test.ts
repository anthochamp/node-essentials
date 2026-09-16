import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContainerRm } from "./container-rm.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContainerRm", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("removes a single container", async () => {
		await dockerContainerRm(["my-container"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container rm 'my-container'",
			{ encoding: "utf8" },
		);
	});

	test("removes multiple containers", async () => {
		await dockerContainerRm(["c1", "c2"]);

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container rm 'c1' 'c2'",
			{ encoding: "utf8" },
		);
	});

	test("sets --force, --link and --volumes", async () => {
		await dockerContainerRm(["c1"], {
			force: true,
			link: true,
			volumes: true,
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container rm --force --link --volumes 'c1'",
			{ encoding: "utf8" },
		);
	});

	test("puts --context before the subcommand", async () => {
		await dockerContainerRm(["c1"], { context: "remote", force: true });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' container rm --force 'c1'",
			{ encoding: "utf8" },
		);
	});
});
