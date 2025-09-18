import { execAsync } from "@ac-essentials/misc-util";
import { beforeEach, expect, suite, test, vi } from "vitest";
import { dockerImageRm } from "./image-rm.js";

vi.mock(import("@ac-essentials/misc-util"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerImageRm", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	test("should call docker image rm with image ids", async () => {
		await dockerImageRm(["image1", "image2"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm 'image1' 'image2'",
		);
	});

	test("should call docker image rm with force and noPrune options", async () => {
		await dockerImageRm(["image1"], { force: true, noPrune: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --force --no-prune 'image1'",
		);
	});

	test("should call docker image rm with force option", async () => {
		await dockerImageRm(["image1"], { force: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --force 'image1'",
		);
	});

	test("should call docker image rm with noPrune option", async () => {
		await dockerImageRm(["image1"], { noPrune: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --no-prune 'image1'",
		);
	});

	test("should escape image ids", async () => {
		await dockerImageRm(["image'1", 'image"2']);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm 'image'\\''1' 'image\"2'",
		);
	});
});
