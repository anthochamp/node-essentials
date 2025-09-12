import { readFile, type writeFile } from "node:fs/promises";
import type { JsonValue, Simplify } from "type-fest";
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

export type JsonFileFormat = TextFileFormat & {
	/**
	 * The indentation string of the JSON file.
	 *
	 * If `null`, the indentation style is unknown.
	 */
	indentation: string | null;
};

export type JsonFileFormatOptions = TextFileFormatOptions & {
	/**
	 * The indentation string of the JSON file.
	 *
	 * Defaults to an empty string (no indentation).
	 */
	indentation?: string;
};

export type ReadJsonFileOptions = ReadTextFileOptions & {
	/**
	 * A function that alters the behavior of the stringification process.
	 *
	 * See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#the_reviver_parameter)
	 * for more information.
	 */
	reviver?: JsonReviver;
};

export const READ_JSON_FILE_DEFAULT_OPTIONS: Required<ReadJsonFileOptions> = {
	...READ_TEXT_FILE_DEFAULT_OPTIONS,
	reviver: null,
};

/**
 * Reads a JSON file and parses its content.
 *
 * @param path Path to the JSON file.
 * @param options Options for reading the file and parsing JSON.
 * @returns	Parsed JSON content.
 */
export async function readJsonFile(
	path: Parameters<typeof readFile>[0],
	options?: ReadJsonFileOptions,
): Promise<JsonValue> {
	const { reviver, ...restOptions } = defaults(
		options,
		READ_JSON_FILE_DEFAULT_OPTIONS,
	);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: JsonValue;

	try {
		result = JSON.parse(fileContent, reviver ?? undefined);
	} catch (error) {
		throw new Error(`parse JSON`, { cause: error });
	}

	return result;
}

export type WriteJsonFileOptions = Simplify<
	WriteTextFileOptions &
		JsonFileFormatOptions & {
			/**
			 * A function that alters the behavior of the stringification process.
			 *
			 * See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)
			 * for more information.
			 */
			replacer?: JsonReplacer;
		}
>;

export const WRITE_JSON_FILE_DEFAULT_OPTIONS: Required<WriteJsonFileOptions> = {
	...WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	replacer: null,
	indentation: "",
};

/**
 * Writes a JSON file by stringifying the provided data.
 *
 * @param path Path to the JSON file.
 * @param data Data to be stringified and written to the file.
 * @param options Options for writing the file and stringifying JSON.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeJsonFile(
	path: Parameters<typeof writeFile>[0],
	data: unknown,
	options?: WriteJsonFileOptions,
): Promise<void> {
	const { replacer, indentation, ...restOptions } = defaults(
		options,
		WRITE_JSON_FILE_DEFAULT_OPTIONS,
	);

	let fileContent: string | undefined;
	try {
		fileContent = JSON.stringify(data, replacer, indentation);
	} catch (error) {
		throw new Error(`stringify JSON`, { cause: error });
	}

	if (fileContent === undefined) {
		throw new TypeError(
			`Invalid type ${typeof data} Unable to stringify data to JSON`,
		);
	}

	return writeTextFile(path, fileContent, restOptions);
}

/**
 * Resolves the format of a JSON file buffer, including its indentation style.
 *
 * @param source The source of the JSON file, either as a Buffer or a file path.
 * @param options Options for reading the file.
 * @returns A promise that resolves to the JSON file format information.
 */
export async function resolveJsonFileFormat(
	data: Buffer,
): Promise<JsonFileFormat> {
	const textFileFormat = await resolveTextFileFormat(data);

	let bufferEncoding: BufferEncoding | null = null;
	if (textFileFormat.charsetEncoding) {
		bufferEncoding = chardetCharsetToBufferEncoding(
			textFileFormat.charsetEncoding,
		);
	}

	const content = data.toString(bufferEncoding ?? "binary");

	let indentation: string | null = null;
	const match = content.match(/^( +|\t+)/m);
	if (match) {
		indentation = match[1];
	}

	return {
		...textFileFormat,
		indentation,
	};
}
