import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { shortenPosixPath } from "./shorten-posix-path.js";

const PROCESS_CWD = "/opt/myapp";
const PROCESS_ENV_HOME = "/home/user";

describe("shortenPosixPath", () => {
	let processCwdMock: MockInstance<typeof process.cwd>;
	let originalEnvHome: string | undefined;

	beforeAll(() => {
		processCwdMock = vi.spyOn(process, "cwd");

		originalEnvHome = process.env.HOME;
	});

	afterAll(() => {
		process.env.HOME = originalEnvHome;

		processCwdMock.mockRestore();
	});

	beforeEach(() => {
		processCwdMock.mockReturnValue(PROCESS_CWD);
		process.env.HOME = PROCESS_ENV_HOME;
	});

	afterEach(() => {
		processCwdMock.mockReset();
	});

	it("should return '.' for empty path", () => {
		expect(shortenPosixPath("")).toBe(".");
	});

	it("should return '.' for current working directory", () => {
		expect(shortenPosixPath(PROCESS_CWD)).toBe(".");
	});

	it("should return relative path from cwd", () => {
		const path = shortenPosixPath(`${PROCESS_CWD}/test/file.txt`);
		expect(path).toBe("test/file.txt");
	});

	it("should return relative path from home if shorter", () => {
		const path = shortenPosixPath(PROCESS_ENV_HOME);
		expect(path).toBe("~");
	});

	it("should return relative path from home if shorter with subpath", () => {
		const path = shortenPosixPath(`${PROCESS_ENV_HOME}/documents/file.txt`);
		expect(path).toBe("~/documents/file.txt");
	});

	it("should return relative path from cwd if shorter than from home", () => {
		const path = shortenPosixPath(`/some/really/long/path/to/a/file.txt`);
		expect(path).toBe("../../some/really/long/path/to/a/file.txt");
	});

	it("should return relative path from cwd if HOME is not set", () => {
		process.env.HOME = "";

		const path = shortenPosixPath(`${PROCESS_ENV_HOME}/documents/file.txt`);
		expect(path).toBe("../../home/user/documents/file.txt");
	});
});
