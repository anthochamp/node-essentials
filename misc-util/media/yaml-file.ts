import { readFile, type writeFile } from "node:fs/promises";
import type { Except } from "type-fest";
import * as yaml from "yaml";
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

export type YamlFileFormat = TextFileFormat;

export type YamlFileFormatOptions = Except<
	TextFileFormatOptions,
	"endOfLine" | "finalNewline"
> & {
	documentOptions?: yaml.DocumentOptions;

	schemaOptions?: yaml.SchemaOptions;

	createNodeOptions?: yaml.CreateNodeOptions;

	toStringOptions?: yaml.ToStringOptions;
};

export type ReadYamlFileOptions = ReadTextFileOptions & {
	parseOptions?: yaml.ParseOptions;

	documentOptions?: yaml.DocumentOptions;

	schemaOptions?: yaml.SchemaOptions;

	toJsOptions?: yaml.ToJSOptions;
};

export const READ_YAML_FILE_DEFAULT_OPTIONS: Required<ReadYamlFileOptions> = {
	...READ_TEXT_FILE_DEFAULT_OPTIONS,
	parseOptions: {},
	documentOptions: {},
	schemaOptions: {},
	toJsOptions: {},
};

/**
 * Reads a YAML file and parses its content.
 *
 * @param path Path to the YAML file.
 * @param options Options for reading the file and parsing YAML.
 * @returns	Parsed YAML content.
 */
export async function readYamlFile(
	path: Parameters<typeof readFile>[0],
	options?: ReadYamlFileOptions,
): Promise<unknown> {
	const {
		parseOptions,
		documentOptions,
		schemaOptions,
		toJsOptions,
		...restOptions
	} = defaults(options, READ_YAML_FILE_DEFAULT_OPTIONS);

	const fileContent = await readFile(path, {
		...restOptions,
		signal: restOptions.signal ?? undefined,
	});

	let result: unknown;

	try {
		result = yaml.parse(fileContent, {
			...parseOptions,
			...documentOptions,
			...schemaOptions,
			...toJsOptions,
		});
	} catch (error) {
		throw new Error(`parse YAML`, { cause: error });
	}

	return result;
}

export type WriteYamlFileOptions = WriteTextFileOptions &
	YamlFileFormatOptions & {
		parseOptions?: yaml.ParseOptions;
	};

export const WRITE_YAML_FILE_DEFAULT_OPTIONS: Required<WriteYamlFileOptions> = {
	...WRITE_TEXT_FILE_DEFAULT_OPTIONS,
	documentOptions: {},
	schemaOptions: {},
	createNodeOptions: {},
	toStringOptions: {},
	parseOptions: {},
};

/**
 * Writes a YAML file by stringifying the provided data.
 *
 * @param path Path to the YAML file.
 * @param data Data to be stringified and written to the file.
 * @param options Options for writing the file and stringifying YAML.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeYamlFile(
	path: Parameters<typeof writeFile>[0],
	data: unknown,
	options?: WriteYamlFileOptions,
): Promise<void> {
	const {
		documentOptions,
		schemaOptions,
		createNodeOptions,
		toStringOptions,
		parseOptions,
		...restOptions
	} = defaults(options, WRITE_YAML_FILE_DEFAULT_OPTIONS);

	let fileContent: string;
	try {
		fileContent = yaml.stringify(data, {
			...documentOptions,
			...schemaOptions,
			...createNodeOptions,
			...toStringOptions,
			...parseOptions,
		});
	} catch (error) {
		throw new Error(`stringify YAML`, { cause: error });
	}

	return writeTextFile(path, fileContent, {
		...restOptions,
		finalNewline: null,
		endOfLine: null,
	});
}
