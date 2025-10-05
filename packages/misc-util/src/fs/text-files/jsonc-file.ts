import { readFile, type writeFile } from "node:fs/promises";
import jsonc, {
	type FormattingOptions,
	type ParseError,
	type ParseOptions,
} from "jsonc-parser";
import type { Except, JsonValue, Simplify } from "type-fest";
import { defaults } from "../../ecma/object/defaults.js";
import {
	type JsonFileFormat,
	type JsonFileFormatOptions,
	READ_JSON_FILE_DEFAULT_OPTIONS,
	WRITE_JSON_FILE_DEFAULT_OPTIONS,
	type WriteJsonFileOptions,
} from "./json-file.js";
import {
	type ReadTextFileOptions,
	type WriteTextFileOptions,
	writeTextFile,
} from "./text-file.js";

export class JsoncParseError extends Error {
	readonly offset: number;
	readonly length: number;
	readonly code: ParseError["error"];

	constructor(error: ParseError) {
		super(
			`${jsonc.printParseErrorCode(error.error)} (${error.offset},${error.offset + error.length})`,
		);

		this.offset = error.offset;
		this.length = error.length;
		this.code = error.error;
		this.name = "JsoncParseError";
	}
}

export type JsoncFileFormat = JsonFileFormat;

export type JsoncFileFormatOptions = JsonFileFormatOptions &
	Except<FormattingOptions, "eol" | "insertFinalNewline"> & {
		/**
		 * The original content of the JSONC file.
		 */
		originalContent?: string;
	};

export type ReadJsoncFileOptions = ReadTextFileOptions & ParseOptions;

export const READ_JSONC_FILE_DEFAULT_OPTIONS: Required<ReadJsoncFileOptions> = {
	...READ_JSON_FILE_DEFAULT_OPTIONS,
	allowEmptyContent: false,
	allowTrailingComma: true,
	disallowComments: false,
};

/**
 * Reads a JSONC file and parses its content.
 *
 * @param path Path to the JSONC file.
 * @param options Options for reading the file and parsing JSONC.
 * @returns	Parsed JSONC content.
 */
export async function readJsoncFile<
	O extends ReadJsoncFileOptions = ReadJsoncFileOptions,
>(
	path: Parameters<typeof readFile>[0],
	options: O,
): Promise<
	O["allowEmptyContent"] extends false
		? JsonValue
		: O["allowEmptyContent"] extends true
			? JsonValue | undefined
			: (typeof READ_JSONC_FILE_DEFAULT_OPTIONS)["allowEmptyContent"] extends false
				? JsonValue
				: JsonValue | undefined
> {
	const {
		allowEmptyContent,
		allowTrailingComma,
		disallowComments,
		...restOptions
	} = defaults(options, READ_JSONC_FILE_DEFAULT_OPTIONS);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: JsonValue;
	const errors: ParseError[] = [];

	try {
		result = jsonc.parse(fileContent, errors, {
			allowEmptyContent,
			allowTrailingComma,
			disallowComments,
		});
	} catch (error) {
		throw new Error(`parse JSONC`, { cause: error });
	}

	if (errors.length > 0) {
		throw new AggregateError(
			errors.map((error) => new JsoncParseError(error)),
			"parse JSONC",
		);
	}

	return result;
}

export type WriteJsoncFileOptions = Simplify<
	WriteTextFileOptions & JsoncFileFormatOptions
>;

const WRITE_JSONC_FILE_DEFAULT_OPTIONS: Required<WriteJsoncFileOptions> = {
	...WRITE_JSON_FILE_DEFAULT_OPTIONS,
	originalContent: "",
	tabSize: 2,
	insertSpaces: true,
	keepLines: true,
};

/**
 * Writes a JSONC file by stringifying the provided data.
 *
 * @param path Path to the JSONC file.
 * @param data Data to be stringified and written to the file.
 * @param options Options for writing the file and stringifying JSONC.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeJsoncFile(
	path: Parameters<typeof writeFile>[0],
	data: unknown,
	options?: WriteJsonFileOptions,
): Promise<void> {
	const {
		originalContent,
		endOfLine,
		finalNewline,
		insertSpaces,
		tabSize,
		keepLines,
		...restOptions
	} = defaults(options, WRITE_JSONC_FILE_DEFAULT_OPTIONS);

	let fileContent: string;
	try {
		fileContent = jsonc.applyEdits(
			originalContent,
			jsonc.modify(originalContent, [], data, {
				formattingOptions: {
					eol: endOfLine ?? undefined,
					insertFinalNewline: finalNewline ?? undefined,
					insertSpaces,
					tabSize,
					keepLines,
				},
			}),
		);
	} catch (error) {
		throw new Error(`stringify JSONC`, { cause: error });
	}

	return writeTextFile(path, fileContent, restOptions);
}
