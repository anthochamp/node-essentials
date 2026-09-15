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
	});

	test("creates a network by name", async () => {
		await dockerNetworkCreate("my-network");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network create 'my-network'",
		);
	});

	test("sets --driver", async () => {
		await dockerNetworkCreate("my-network", { driver: "overlay" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network create --driver 'overlay' 'my-network'",
		);
	});
});
