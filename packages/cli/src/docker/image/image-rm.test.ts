import { execAsync } from "@ac-essentials/misc-util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dockerImageRm } from "./image-rm.js";

vi.mock(import("@ac-essentials/misc-util"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

describe("dockerImageRm", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	it("should call docker image rm with image ids", async () => {
		await dockerImageRm(["image1", "image2"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm 'image1' 'image2'",
		);
	});

	it("should call docker image rm with force and noPrune options", async () => {
		await dockerImageRm(["image1"], { force: true, noPrune: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --force --no-prune 'image1'",
		);
	});

	it("should call docker image rm with force option", async () => {
		await dockerImageRm(["image1"], { force: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --force 'image1'",
		);
	});

	it("should call docker image rm with noPrune option", async () => {
		await dockerImageRm(["image1"], { noPrune: true });

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm --no-prune 'image1'",
		);
	});

	it("should escape image ids", async () => {
		await dockerImageRm(["image'1", 'image"2']);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker image rm 'image'\\''1' 'image\"2'",
		);
	});
});
