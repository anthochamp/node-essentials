import { readFile, type writeFile } from "node:fs/promises";
import toml, { type TomlTable, type TomlTableWithoutBigInt } from "smol-toml";
import { defaults } from "../../ecma/object/defaults.js";
import {
	READ_TEXT_FILE_DEFAULT_OPTIONS,
	type ReadTextFileOptions,
	type TextFileFormat,
	type TextFileFormatOptions,
	WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	type WriteTextFileOptions,
	writeTextFile,
} from "./text-file.js";

export type TomlFileFormat = TextFileFormat;

export type TomlFileFormatOptions = TextFileFormatOptions &
	NonNullable<Parameters<typeof toml.stringify>[1]>;

export type ReadTomlFileOptions = ReadTextFileOptions & {
	/**
	 *
	 */
	useBigInt?: boolean | "asNeeded";
};

export const READ_TOML_FILE_DEFAULT_OPTIONS: Required<ReadTomlFileOptions> = {
	...READ_TEXT_FILE_DEFAULT_OPTIONS,
	useBigInt: false,
};

type ReadTomlFileResult_<TOptions extends ReadTomlFileOptions> =
	TOptions["useBigInt"] extends false | undefined
		? TomlTableWithoutBigInt
		: TomlTable;

/**
 * Reads a TOML file and parses its content.
 *
 * @param path Path to the TOML file.
 * @param options Options for reading the file and parsing TOML.
 * @returns	Parsed TOML content.
 */
export async function readTomlFile<TOptions extends ReadTomlFileOptions>(
	path: Parameters<typeof readFile>[0],
	options?: TOptions,
): Promise<ReadTomlFileResult_<TOptions>> {
	const { useBigInt, ...restOptions } = defaults(
		options,
		READ_TOML_FILE_DEFAULT_OPTIONS,
	);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: ReadTomlFileResult_<TOptions>;

	try {
		result = toml.parse(fileContent, {
			integersAsBigInt: useBigInt,
		});
	} catch (error) {
		throw new Error(`parse TOML`, { cause: error });
	}

	return result;
}

export type WriteTomlFileOptions = WriteTextFileOptions &
	TomlFileFormatOptions & {};

export const WRITE_TOML_FILE_DEFAULT_OPTIONS: Required<WriteTomlFileOptions> = {
	...WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	maxDepth: Infinity,
	numbersAsFloat: false,
};

/**
 * Writes a TOML file by stringifying the provided data.
 *
 * @param path Path to the TOML file.
 * @param rootTable The root table object to stringify.
 * @param options Options for writing the file and stringifying TOML.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeTomlFile(
	path: Parameters<typeof writeFile>[0],
	rootTable: Parameters<typeof toml.stringify>[0],
	options?: WriteTomlFileOptions,
): Promise<void> {
	const { maxDepth, numbersAsFloat, ...restOptions } = defaults(
		options,
		WRITE_TOML_FILE_DEFAULT_OPTIONS,
	);

	let fileContent: string;
	try {
		fileContent = toml.stringify(rootTable, {
			maxDepth,
			numbersAsFloat,
		});
	} catch (error) {
		throw new Error(`stringify TOML`, { cause: error });
	}

	return writeTextFile(path, fileContent, restOptions);
}
