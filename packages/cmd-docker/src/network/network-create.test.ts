import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerNetworkCreate } from "./network-create.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerNetworkCreate", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("creates a network by name", async () => {
		await dockerNetworkCreate("my-network");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network create 'my-network'",
			{ encoding: "utf8" },
		);
	});

	test("sets --driver", async () => {
		await dockerNetworkCreate("my-network", { driver: "overlay" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network create --driver 'overlay' 'my-network'",
			{ encoding: "utf8" },
		);
	});

	test("puts --context before the subcommand", async () => {
		await dockerNetworkCreate("my-network", { context: "remote" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' network create 'my-network'",
			{ encoding: "utf8" },
		);
	});
});
