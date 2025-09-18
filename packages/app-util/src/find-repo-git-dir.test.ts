import { findUp } from "find-up";
import { beforeEach, expect, suite, test, vi } from "vitest";
import { findRepoGitDir } from "./find-repo-git-dir.js";

vi.mock(import("find-up"), async (importActual) => {
	const actual = await importActual();

	return {
		...actual,
		findUp: vi.fn(),
	};
});

const findUpMock = vi.mocked(findUp);

suite("findRepoGitDir", () => {
	beforeEach(() => {
		findUpMock.mockReset();
	});

	test("should return the .git directory path if found", async () => {
		const mockPath = "/path/to/repo/.git";
		findUpMock.mockResolvedValueOnce(mockPath);

		const result = await findRepoGitDir("/path/to/repo");
		expect(result).toBe(mockPath);
		expect(findUpMock).toHaveBeenCalledWith(".git", {
			cwd: "/path/to/repo",
			type: "directory",
			allowSymlinks: undefined,
		});
	});

	test("should return null if the .git directory is not found", async () => {
		findUpMock.mockResolvedValueOnce(undefined);

		const result = await findRepoGitDir("/path/to/repo");
		expect(result).toBeNull();
		expect(findUpMock).toHaveBeenCalledWith(".git", {
			cwd: "/path/to/repo",
			type: "directory",
			allowSymlinks: undefined,
		});
	});

	test("should pass options to findUp", async () => {
		const mockPath = "/path/to/repo/.git";
		findUpMock.mockResolvedValueOnce(mockPath);

		const result = await findRepoGitDir("/path/to/repo", {
			allowSymlinks: true,
		});
		expect(result).toBe(mockPath);
		expect(findUpMock).toHaveBeenCalledWith(".git", {
			cwd: "/path/to/repo",
			type: "directory",
			allowSymlinks: true,
		});
	});
});
