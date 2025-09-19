import { readFile, type writeFile } from "node:fs/promises";
import ini from "ini";
import type { UnknownRecord } from "type-fest";
import { chardetCharsetToBufferEncoding } from "../3rdparty/chardet/chardet-charset-to-buffer-encoding.js";
import { defaults } from "../ecma/object/defaults.js";
import {
	READ_TEXT_FILE_DEFAULT_OPTIONS,
	type ReadTextFileOptions,
	resolveTextFileFormat,
	type TextFileFormat,
	type TextFileFormatOptions,
	WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	type WriteTextFileOptions,
	writeTextFile,
} from "./text-file.js";

export type IniFileFormat = TextFileFormat & {
	/**
	 * Whether the INI file has spaces around the equal signs.
	 *
	 * If `null`, the style is unknown.
	 */
	assignmentSpaces: boolean | null;
};

export type IniFileFormatOptions = TextFileFormatOptions & {
	/**
	 * Whether the INI file has spaces around the equal signs.
	 *
	 * Defaults to `false`.
	 */
	assignmentSpaces?: boolean;

	/**
	 * Whether to align equal signs in the INI file.
	 *
	 * Defaults to `false`.
	 */
	alignAssignments?: boolean;

	/**
	 * Identifier to use for global items and to prepend to all other sections.
	 *
	 * Defaults to `#`.
	 */
	sectionIdentifier?: string;

	/**
	 * Whether to sort sections and keys alphabetically.
	 *
	 * Defaults to `false`.
	 */
	sort?: boolean;

	/**
	 * Whether to insert a newline after each section header.
	 *
	 * Defaults to `false`.
	 */
	sectionNewline?: boolean;

	/**
	 * Whether to append `[]` to array keys.
	 *
	 * Defaults to `true`.
	 */
	bracketedArray?: boolean;
};

export type ReadIniFileOptions = ReadTextFileOptions & {
	/**
	 * Whether to parse values as arrays when they have `[]` suffix.
	 *
	 * Defaults to `true`.
	 */
	bracketedArray?: boolean;
};

export const READ_INI_FILE_DEFAULT_OPTIONS: Required<ReadIniFileOptions> = {
	...READ_TEXT_FILE_DEFAULT_OPTIONS,

	bracketedArray: true,
};

/**
 * Reads a INI file and parses its content.
 *
 * @param path Path to the INI file.
 * @param options Options for reading the file and parsing INI.
 * @returns	Parsed INI content.
 */
export async function readIniFile(
	path: Parameters<typeof readFile>[0],
	options?: ReadIniFileOptions,
): Promise<UnknownRecord> {
	const { bracketedArray, ...restOptions } = defaults(
		options,
		READ_INI_FILE_DEFAULT_OPTIONS,
	);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: UnknownRecord;

	try {
		result = ini.parse(fileContent, {
			bracketedArray,
		});
	} catch (error) {
		throw new Error(`parse INI`, { cause: error });
	}

	return result;
}

export type WriteIniFileOptions = WriteTextFileOptions & IniFileFormatOptions;

export const WRITE_INI_FILE_DEFAULT_OPTIONS: Required<WriteIniFileOptions> = {
	...WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	assignmentSpaces: false,
	alignAssignments: false,
	sectionIdentifier: "#",
	sort: false,
	sectionNewline: false,
	bracketedArray: true,
};

/**
 * Writes a INI file by stringifying the provided data.
 *
 * @param path Path to the INI file.
 * @param data Data to be stringified and written to the file.
 * @param options Options for writing the file and stringifying INI.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeIniFile(
	path: Parameters<typeof writeFile>[0],
	data: UnknownRecord,
	options?: WriteIniFileOptions,
): Promise<void> {
	const {
		assignmentSpaces,
		alignAssignments,
		sectionIdentifier,
		sort,
		sectionNewline,
		bracketedArray,
		endOfLine,
		...restOptions
	} = defaults(options, WRITE_INI_FILE_DEFAULT_OPTIONS);

	let fileContent: string;
	try {
		fileContent = ini.stringify(data, {
			sort,
			whitespace: assignmentSpaces,
			align: alignAssignments,
			bracketedArray,
			section: sectionIdentifier,
			newline: sectionNewline,
			platform: endOfLine === "\r\n" ? "win32" : "unix",
		});
	} catch (error) {
		throw new Error(`stringify INI`, { cause: error });
	}

	return writeTextFile(path, fileContent, restOptions);
}

/**
 * Resolves the format of a INI file buffer, including its indentation style.
 *
 * @param data A Buffer containing the INI file content.
 * @returns A promise that resolves to the INI file format information.
 */
export async function resolveIniFileFormat(
	data: Buffer,
): Promise<IniFileFormat> {
	const textFileFormat = await resolveTextFileFormat(data);

	let bufferEncoding: BufferEncoding | null = null;
	if (textFileFormat.charsetEncoding) {
		bufferEncoding = chardetCharsetToBufferEncoding(
			textFileFormat.charsetEncoding,
		);
	}

	const content = data.toString(bufferEncoding ?? "binary");

	let assignmentSpaces: boolean | null = null;
	if (content.includes("=")) {
		assignmentSpaces = content.includes(" = ");
	}

	return {
		...textFileFormat,
		assignmentSpaces,
	};
}
