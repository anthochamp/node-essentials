import { readFile, writeFile } from "node:fs/promises";
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
import { readJsonFile, writeJsonFile } from "./json-file.js";

vi.mock("node:fs/promises");

describe("json-file", () => {
	describe("readJsonFile", () => {
		let readFileMock: MockInstance<typeof readFile>;

		beforeAll(() => {
			readFileMock = vi.mocked(readFile);
		});
		afterAll(() => {
			readFileMock.mockRestore();
		});
		beforeEach(() => {
			readFileMock.mockReset();
		});

		it("should read and parse JSON file with default encoding", async () => {
			const jsonContent = { key: "value" };
			readFileMock.mockResolvedValueOnce(
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent)!),
			);

			const result = await readJsonFile("/path/to/file.json");
			expect(result).toEqual(jsonContent);
			expect(readFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				expect.anything(),
			);
		});

		it("should read and parse JSON file with specified encoding", async () => {
			const jsonContent = { key: "value" };
			readFileMock.mockResolvedValueOnce(
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent)!),
			);

			const result = await readJsonFile("/path/to/file.json", {
				encoding: "utf-8",
			});
			expect(result).toEqual(jsonContent);
			expect(readFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				expect.objectContaining({
					encoding: "utf-8",
				}),
			);
		});

		it("should read and parse JSON file with reviver", async () => {
			const jsonContent = { key: "value" };
			readFileMock.mockResolvedValueOnce(
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent)!),
			);

			const reviver = vi.fn((key, value) =>
				key === "key" ? "modified" : value,
			);
			const result = await readJsonFile("/path/to/file.json", {
				encoding: "utf-8",
				reviver,
			});
			expect(result).toEqual({ key: "modified" });
			expect(readFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				expect.objectContaining({
					encoding: "utf-8",
				}),
			);
			expect(reviver).toHaveBeenCalled();
		});

		it("should throw an error if JSON is invalid", async () => {
			readFileMock.mockResolvedValueOnce(Buffer.from("invalid json"));
			await expect(
				readJsonFile("/path/to/file.json", { encoding: "utf-8" }),
			).rejects.toThrow("parse JSON");
			expect(readFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				expect.objectContaining({
					encoding: "utf-8",
				}),
			);
		});
	});

	describe("writeJsonFile", () => {
		let writeFileMock: MockInstance<typeof writeFile>;

		beforeAll(() => {
			writeFileMock = vi.mocked(writeFile);
		});
		afterAll(() => {
			writeFileMock.mockRestore();
		});
		beforeEach(() => {
			writeFileMock.mockReset();
		});

		it("should stringify and write JSON file with default options", async () => {
			const jsonContent = { key: "value" };
			writeFileMock.mockResolvedValueOnce();

			await writeJsonFile("/path/to/file.json", jsonContent);
			expect(writeFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent)!),
				expect.anything(),
			);
		});

		it("should stringify and write JSON file with replacer and space", async () => {
			const jsonContent = { key: "value", ignore: "this" };
			writeFileMock.mockResolvedValueOnce();

			const replacer = (key: string) => (key === "ignore" ? undefined : key);
			const space = 2;

			await writeJsonFile("/path/to/file.json", jsonContent, {
				replacer,
				indentation: " ".repeat(space),
				charsetEncoding: "utf-8",
			});
			expect(writeFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent, replacer, space)!),
				expect.objectContaining({
					encoding: null,
				}),
			);
		});

		it("should throw an error if writing fails", async () => {
			const jsonContent = { key: "value" };
			writeFileMock.mockRejectedValueOnce(new Error("Write error"));

			await expect(
				writeJsonFile("/path/to/file.json", jsonContent),
			).rejects.toThrow("Write error");
			expect(writeFileMock).toHaveBeenCalledWith(
				"/path/to/file.json",
				// biome-ignore lint/style/noNonNullAssertion: jsonContent is neither undefined, function nor symbol
				Buffer.from(JSON.stringify(jsonContent)!),
				expect.anything(),
			);
		});
	});
});
