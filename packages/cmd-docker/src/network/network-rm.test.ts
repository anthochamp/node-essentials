import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerNetworkRm } from "./network-rm.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerNetworkRm", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	test("removes a single network", async () => {
		await dockerNetworkRm(["my-network"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network rm 'my-network'",
		);
	});

	test("removes multiple networks", async () => {
		await dockerNetworkRm(["net-a", "net-b"]);

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker network rm 'net-a' 'net-b'",
		);
	});
});
