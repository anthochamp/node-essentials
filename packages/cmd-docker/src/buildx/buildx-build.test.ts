import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerBuildxBuild } from "./buildx-build.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerBuildxBuild", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("builds a path", async () => {
		await dockerBuildxBuild("./fixtures/postfix");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker buildx build './fixtures/postfix'",
			{ encoding: "utf8" },
		);
	});

	test("sets multiple --tag entries", async () => {
		await dockerBuildxBuild(".", { tags: ["a:1", "b:2"] });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker buildx build --tag 'a:1' --tag 'b:2' '.'",
			{ encoding: "utf8" },
		);
	});

	test("puts --context before the subcommand", async () => {
		await dockerBuildxBuild(".", { context: "remote", tags: ["a:1"] });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' buildx build --tag 'a:1' '.'",
			{ encoding: "utf8" },
		);
	});
});
