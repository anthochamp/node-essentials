import { constants } from "node:fs";
import {
	mkdtemp,
	readdir,
	readFile,
	rmdir,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
	afterEach,
	beforeEach,
	expect,
	type MockInstance,
	suite,
	test,
	vi,
} from "vitest";

import { writeFileAtomic } from "./write-file-atomic.js";

vi.mock("node:fs/promises", async (importActual) => {
	const actual = await importActual<typeof import("node:fs/promises")>();
	return {
		...actual,
		writeFile: vi.fn(actual.writeFile),
	};
});

suite("writeFileAtomic", () => {
	let originalWriteFile: typeof writeFile;
	let writeFileMock: MockInstance<typeof writeFile>;

	let tmpDir: string;
	let testFilePath: string;

	beforeEach(async () => {
		originalWriteFile = await vi
			.importActual("node:fs/promises")
			.then((m) => m.writeFile as typeof writeFile);
		writeFileMock = vi.mocked(writeFile);

		tmpDir = await mkdtemp(join(tmpdir(), `writeFileAtomic-`));

		testFilePath = `${tmpDir}/file.txt`;
	});

	afterEach(async () => {
		writeFileMock.mockRestore();

		try {
			await unlink(testFilePath);
		} catch {}

		await rmdir(tmpDir);
	});

	test("should write to a file if the file does not exist (mode=w)", async () => {
		await writeFileAtomic(testFilePath, "data", { flag: "w" });

		const content = await readFile(testFilePath);

		expect(content).toEqual(Buffer.from("data"));
	});

	test("should write to a file if the file exists (mode=w)", async () => {
		await writeFile(testFilePath, "data");
		await writeFileAtomic(testFilePath, "new data", { flag: "w" });

		const content = await readFile(testFilePath);

		expect(content).toEqual(Buffer.from("new data"));
	});

	test.each([
		["a", "a"],
		["ax", "ax"],
		["O_APPEND", constants.O_APPEND | constants.O_WRONLY],
	])("should reject an append flag (%s)", async (_label, flag) => {
		await expect(
			writeFileAtomic(testFilePath, "data", { flag }),
		).rejects.toThrow(TypeError);
	});

	test("should reject an existing file when the flag is exclusive", async () => {
		await writeFile(testFilePath, "data");

		await expect(
			writeFileAtomic(testFilePath, "new data", { flag: "wx" }),
		).rejects.toMatchObject({ code: "EEXIST", syscall: "open" });

		await expect(readFile(testFilePath)).resolves.toEqual(Buffer.from("data"));
	});

	test("should accept a file: URL whose path needs escaping", async () => {
		testFilePath = join(tmpDir, "a file.txt");

		await writeFileAtomic(pathToFileURL(testFilePath), "data");

		await expect(readFile(testFilePath)).resolves.toEqual(Buffer.from("data"));
	});

	test("should carry the existing permission bits over", async () => {
		await writeFile(testFilePath, "data", { mode: 0o600 });

		await writeFileAtomic(testFilePath, "new data");

		const { mode } = await stat(testFilePath);

		expect(mode & 0o777).toBe(0o600);
	});

	test("should leave no temporary file behind when the write fails", async () => {
		writeFileMock.mockRejectedValueOnce(new Error("disk on fire"));

		await expect(writeFileAtomic(testFilePath, "data")).rejects.toThrow(
			"disk on fire",
		);

		await expect(readdir(tmpDir)).resolves.toEqual([]);
	});

	suite("should write atomically", () => {
		let deferredTmpFileWrite: ReturnType<typeof Promise.withResolvers<void>>;
		let testTmpFilePathPrefix: string;

		beforeEach(() => {
			deferredTmpFileWrite = Promise.withResolvers<void>();
			testTmpFilePathPrefix = `${testFilePath}.tmp`;

			writeFileMock.mockImplementation(async (file, data, options) => {
				if (
					typeof file === "string" &&
					file.startsWith(testTmpFilePathPrefix)
				) {
					await deferredTmpFileWrite.promise;

					return originalWriteFile(file, data, options);
				}
				return originalWriteFile(file, data, options);
			});
		});

		afterEach(() => {
			writeFileMock.mockReset();
		});

		test("should write atomically to a file that is created while writing the temporary file (mode=w)", async () => {
			const promise = writeFileAtomic(testFilePath, "data", { flag: "w" });

			await vi.waitFor(() =>
				expect(writeFileMock).toHaveBeenCalledWith(
					expect.stringMatching(testTmpFilePathPrefix),
					expect.anything(),
					expect.anything(),
				),
			);

			// Simulate a write to the target file while the atomic write is in progress
			await originalWriteFile(testFilePath, "other data");

			deferredTmpFileWrite.resolve();

			await promise;

			const content = await readFile(testFilePath);

			expect(content).toEqual(Buffer.from("data"));
		});

		test("should write atomically to a file that is changed while writing the temporary file (mode=w)", async () => {
			// Simulate a write to the target file while the atomic write is in progress
			await originalWriteFile(testFilePath, "some data");

			const promise = writeFileAtomic(testFilePath, "data", { flag: "w" });

			await vi.waitFor(() =>
				expect(writeFileMock).toHaveBeenCalledWith(
					expect.stringMatching(testTmpFilePathPrefix),
					expect.anything(),
					expect.anything(),
				),
			);

			// Simulate a write to the target file while the atomic write is in progress
			await originalWriteFile(testFilePath, "other data");

			deferredTmpFileWrite.resolve();

			await promise;

			const content = await readFile(testFilePath);

			expect(content).toEqual(Buffer.from("data"));
		});
	});
});
