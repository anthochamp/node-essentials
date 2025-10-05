import { readFile, writeFile } from "node:fs/promises";

import chardet = require("chardet");

import iconvLite from "iconv-lite";
import type { Except, SetNonNullable } from "type-fest";
import { chardetCharsetToBufferEncoding } from "../../3rdparty/chardet/chardet-charset-to-buffer-encoding.js";
import { UnsupportedError } from "../../ecma/error/unsupported-error.js";
import { defaults } from "../../ecma/object/defaults.js";
import {
	NODE_READ_FILE_DEFAULT_OPTIONS,
	NODE_WRITE_FILE_DEFAULT_OPTIONS,
	type NodeReadFileOptions,
	type NodeWriteFileOptions,
} from "../../node/fs/types.js";

/**
 * Describes the format of a text file.
 */
export type TextFileFormat = {
	/**
	 * The character set encoding of the file.
	 *
	 * If `null`, the encoding is unknown or binary.
	 */
	charsetEncoding: chardet.EncodingName | null;

	/**
	 * The line ending style of the file.
	 *
	 * If `null`, the line ending style is unknown or mixed.
	 */
	endOfLine: "\n" | "\r\n" | null;

	/**
	 * Whether the file ends with a newline.
	 */
	finalNewline: boolean;

	/**
	 * Whether to the file has lines with trailing whitespace.
	 */
	trailingWhitespace: boolean;

	/**
	 * The indentation string of the file.
	 *
	 * If `null`, the indentation style is unknown or not applicable.
	 *
	 * Indentation style might be a mix of tabs and spaces.
	 */
	indentation: string | null;
};

/**
 * Options for formatting text files when writing.
 */
export type TextFileFormatOptions = {
	/**
	 * The character set encoding of the file.
	 *
	 * Defaults to "utf-8".
	 */
	charsetEncoding?: string;

	/**
	 * The line ending style of the file.
	 *
	 * If `null`, the stringifier default is used.
	 *
	 * Defaults to `null`.
	 */
	endOfLine?: "\n" | "\r\n" | null;

	/**
	 * Whether the file should end with a newline.
	 *
	 * If `null`, the stringifier default is used.
	 *
	 * Defaults to `null`.
	 */
	finalNewline?: boolean | null;

	/**
	 * Whether to trim trailing whitespace when writing the file.
	 *
	 * If `null`, the stringifier default is used.
	 *
	 * Defaults to `null`.
	 */
	trimTrailingWhitespace?: boolean | null;
};

/**
 * Options for reading text files.
 *
 * `encoding` is required and cannot be `null`.
 */
export type ReadTextFileOptions = SetNonNullable<
	NodeReadFileOptions,
	"encoding"
>;

/**
 * Default options for reading text files.
 */
export const READ_TEXT_FILE_DEFAULT_OPTIONS: Required<ReadTextFileOptions> = {
	...NODE_READ_FILE_DEFAULT_OPTIONS,
	encoding: "utf-8",
};

export function readTextFile(
	file: Parameters<typeof readFile>[0],
	options?: ReadTextFileOptions,
): Promise<string> {
	const { signal, ...readFileOptions } = defaults(
		options,
		READ_TEXT_FILE_DEFAULT_OPTIONS,
	);

	return readFile(file, {
		...readFileOptions,
		signal: signal ?? undefined,
	});
}

/**
 * Options for writing text files.
 */
export type WriteTextFileOptions = Except<NodeWriteFileOptions, "encoding"> &
	TextFileFormatOptions;

/**
 * Default options for writing text files.
 */
export const WRITE_TEXT_FILE_DEFAULT_OPTIONS: Required<WriteTextFileOptions> = {
	...NODE_WRITE_FILE_DEFAULT_OPTIONS,
	charsetEncoding: "utf-8",
	endOfLine: null,
	finalNewline: null,
	trimTrailingWhitespace: null,
};

export function writeTextFile(
	file: Parameters<typeof readFile>[0],
	data: string,
	options?: WriteTextFileOptions,
): Promise<void> {
	const {
		signal,
		charsetEncoding,
		endOfLine,
		finalNewline,
		trimTrailingWhitespace,
		...writeFileOptions
	} = defaults(options, WRITE_TEXT_FILE_DEFAULT_OPTIONS);

	if (trimTrailingWhitespace) {
		data = data.replace(/[ \t]+$/gm, "");
	} else if (endOfLine) {
		data = data.replace(/\r?\n/g, endOfLine);
	}

	if (finalNewline !== /\r?\n$/.test(data)) {
		if (finalNewline) {
			data += endOfLine;
		} else {
			data = data.replace(/\r?\n$/, "");
		}
	}

	let dataBuffer: Buffer;

	if (Buffer.isEncoding(charsetEncoding)) {
		dataBuffer = Buffer.from(data, charsetEncoding);
	} else if (iconvLite.encodingExists(charsetEncoding)) {
		dataBuffer = iconvLite.encode(data, charsetEncoding);
	} else {
		throw new UnsupportedError(`charset encoding "${charsetEncoding}"`);
	}

	return writeFile(file, dataBuffer, {
		...writeFileOptions,
		encoding: null,
		signal: signal ?? undefined,
	});
}

/**
 * Resolves the format of a text file buffer by analyzing its content.
 *
 * @param data A Buffer containing the text file content.
 * @returns The resolved text file format.
 */
export async function resolveTextFileFormat(
	data: Buffer,
): Promise<TextFileFormat> {
	const chardetCharset = chardet.detect(data) as chardet.EncodingName | null;

	let bufferEncoding: BufferEncoding | null = null;
	if (chardetCharset) {
		bufferEncoding = chardetCharsetToBufferEncoding(chardetCharset);
	}

	const content = data.toString(bufferEncoding ?? "binary");

	let endOfLine: TextFileFormat["endOfLine"] = null;
	if (/\r\n/.test(content) && !/\n(?!\r)/.test(content)) {
		endOfLine = "\r\n";
	} else if (/\n/.test(content) && !/\r\n/.test(content)) {
		endOfLine = "\n";
	}

	let finalNewline = false;
	if (/\r?\n$/.test(content)) {
		finalNewline = true;
	}

	const indentation = content.match(/^([\t ]+)\S/m)?.[1] ?? null;

	let trailingWhitespace = false;
	if (/[\t ]+$/m.test(content)) {
		trailingWhitespace = true;
	}

	return {
		charsetEncoding: chardetCharset,
		endOfLine,
		finalNewline,
		indentation,
		trailingWhitespace,
	};
}
