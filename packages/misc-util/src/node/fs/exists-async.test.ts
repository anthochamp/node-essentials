import { access, constants } from "node:fs/promises";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { existsAsync } from "./exists-async.js";

vi.mock("node:fs/promises");

describe("fileExists", () => {
	let accessMock: MockInstance<typeof access>;

	beforeAll(() => {
		accessMock = vi.mocked(access);
	});

	afterAll(() => {
		accessMock.mockRestore();
	});

	beforeEach(() => {
		accessMock.mockReset();
	});

	it("should return true if path exists", async () => {
		accessMock.mockResolvedValueOnce();

		const result = await existsAsync("/some/path");
		expect(result).toBe(true);
		expect(accessMock).toHaveBeenCalledWith("/some/path", constants.F_OK);
	});

	it("should return false if path does not exist", async () => {
		accessMock.mockRejectedValueOnce(new Error("File not found"));

		const result = await existsAsync("/some/missing/path");
		expect(result).toBe(false);
		expect(accessMock).toHaveBeenCalledWith(
			"/some/missing/path",
			constants.F_OK,
		);
	});
});
