import { readFile, type writeFile } from "node:fs/promises";
import json5 from "json5";
import type { JsonValue, Simplify } from "type-fest";
import { defaults } from "../../ecma/object/defaults.js";
import {
	type JsonFileFormat,
	type JsonFileFormatOptions,
	READ_JSON_FILE_DEFAULT_OPTIONS,
	type ReadJsonFileOptions,
	WRITE_JSON_FILE_DEFAULT_OPTIONS,
	type WriteJsonFileOptions,
} from "./json-file.js";
import { writeTextFile } from "./text-file.js";

export type Json5FileFormat = JsonFileFormat & {
	/**
	 * The quote style used in the JSON5 file.
	 *
	 * If `null`, the quote style is unknown or mixed.
	 */
	quoteStyle: "'" | '"' | null;
};

export type Json5FileFormatOptions = JsonFileFormatOptions & {
	/**
	 * The quote style to use when writing the JSON5 file.
	 *
	 * Defaults to double quotes (`"`).
	 */
	quoteStyle?: "'" | '"';
};

export type ReadJson5FileOptions = ReadJsonFileOptions;

export const READ_JSON5_FILE_DEFAULT_OPTIONS: Required<ReadJson5FileOptions> = {
	...READ_JSON_FILE_DEFAULT_OPTIONS,
};

/**
 * Reads a JSON5 file and parses its content.
 *
 * @param path Path to the JSON5 file.
 * @param options Options for reading the file and parsing JSON5.
 * @returns	Parsed JSON5 content.
 */
export async function readJson5File(
	path: Parameters<typeof readFile>[0],
	options: ReadJson5FileOptions,
): Promise<JsonValue> {
	const { reviver, ...restOptions } = defaults(
		options,
		READ_JSON5_FILE_DEFAULT_OPTIONS,
	);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: JsonValue;

	try {
		result = json5.parse(fileContent, reviver ?? undefined);
	} catch (error) {
		throw new Error(`parse JSON5`, { cause: error });
	}

	return result;
}

export type WriteJson5FileOptions = Simplify<
	WriteJsonFileOptions & Json5FileFormatOptions
>;

const WRITE_JSON5_FILE_DEFAULT_OPTIONS: Required<WriteJson5FileOptions> = {
	...WRITE_JSON_FILE_DEFAULT_OPTIONS,
	quoteStyle: '"',
};

/**
 * Writes a JSON5 file by stringifying the provided data.
 *
 * @param path Path to the JSON5 file.
 * @param data Data to be stringified and written to the file.
 * @param options Options for writing the file and stringifying JSON5.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeJson5File(
	path: Parameters<typeof writeFile>[0],
	data: unknown,
	options?: WriteJson5FileOptions,
): Promise<void> {
	const { replacer, indentation, quoteStyle, ...restOptions } = defaults(
		options,
		WRITE_JSON5_FILE_DEFAULT_OPTIONS,
	);

	let fileContent: string;
	try {
		fileContent = json5.stringify(data, {
			replacer,
			space: indentation,
			quote: quoteStyle,
		});
	} catch (error) {
		throw new Error(`stringify JSON`, { cause: error });
	}

	return writeTextFile(path, fileContent, restOptions);
}
