import { readFile, type writeFile } from "node:fs/promises";
import toml from "@ltd/j-toml";
import type { Except } from "type-fest";
import { defaults } from "../ecma/object/defaults.js";
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
	Except<NonNullable<Parameters<typeof toml.stringify>[1]>, "newline">;

export type ReadTomlFileOptions = ReadTextFileOptions & {
	/**
	 *
	 */
	specificationVersion?: 1.0 | 0.5 | 0.4 | 0.3 | 0.2 | 0.1;

	/**
	 *
	 */
	multilineStringJoiner?: string;

	/**
	 *
	 */
	useBigInt?: boolean | number;

	/**
	 *
	 */
	xOptions?: NonNullable<Parameters<typeof toml.parse>[1]>["x"];
};

export const READ_TOML_FILE_DEFAULT_OPTIONS: Required<ReadTomlFileOptions> = {
	...READ_TEXT_FILE_DEFAULT_OPTIONS,
	specificationVersion: 1.0,
	multilineStringJoiner: "",
	useBigInt: false,
	xOptions: {},
};

/**
 * Reads a TOML file and parses its content.
 *
 * @param path Path to the TOML file.
 * @param options Options for reading the file and parsing TOML.
 * @returns	Parsed TOML content.
 */
export async function readTomlFile(
	path: Parameters<typeof readFile>[0],
	options?: ReadTomlFileOptions,
): Promise<ReturnType<typeof toml.parse>> {
	const {
		specificationVersion,
		multilineStringJoiner,
		useBigInt,
		xOptions,
		...restOptions
	} = defaults(options, READ_TOML_FILE_DEFAULT_OPTIONS);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: ReturnType<typeof toml.parse>;

	try {
		result = toml.parse(
			fileContent,
			specificationVersion,
			multilineStringJoiner,
			useBigInt,
			xOptions,
		);
	} catch (error) {
		throw new Error(`parse TOML`, { cause: error });
	}

	return result;
}

export type WriteTomlFileOptions = WriteTextFileOptions &
	TomlFileFormatOptions & {};

export const WRITE_TOML_FILE_DEFAULT_OPTIONS: Required<WriteTomlFileOptions> = {
	...WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	forceInlineArraySpacing: 0,
	indent: "",
	integer: 0,
	newlineAround: "document",
	T: "T",
	xBeforeNewlineInMultilineTable: "",
	xNull: false,
	Z: "Z",
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
	const {
		forceInlineArraySpacing,
		indent,
		integer,
		newlineAround,
		T,
		xBeforeNewlineInMultilineTable,
		xNull,
		Z,
		endOfLine,
		...restOptions
	} = defaults(options, WRITE_TOML_FILE_DEFAULT_OPTIONS);

	let fileContent: string;
	try {
		fileContent = toml.stringify(rootTable, {
			forceInlineArraySpacing,
			indent,
			integer,
			newline: endOfLine ?? undefined,
			newlineAround,
			T,
			xBeforeNewlineInMultilineTable,
			xNull,
			Z,
		});
	} catch (error) {
		throw new Error(`stringify TOML`, { cause: error });
	}

	return writeTextFile(path, fileContent, restOptions);
}
