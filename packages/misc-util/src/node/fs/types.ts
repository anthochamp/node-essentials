import type { readFile, writeFile } from "node:fs/promises";
import type { SetNullable } from "../../types.d/set-nullable.js";

/**
 * Options for fs.readFile (excluding `signal`)
 */
export type NodeReadFileOptions = SetNullable<
	Extract<Parameters<typeof readFile>[1], object>,
	"signal"
>;

/**
 * Options for fs.writeFile (excluding `signal`)
 */
export type NodeWriteFileOptions = SetNullable<
	Extract<Parameters<typeof writeFile>[2], object>,
	"signal"
>;

/**
 * Default options for fs.writeFile from Node.js documentation.
 *
 * @see https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
 */
export const NODE_WRITE_FILE_DEFAULT_OPTIONS: Required<NodeWriteFileOptions> = {
	encoding: null,
	mode: 0o666,
	flag: "w",
	flush: false,
	signal: null,
};

/**
 * Default options for fs.readFile from Node.js documentation.
 *
 * @see https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback
 */
export const NODE_READ_FILE_DEFAULT_OPTIONS: Required<NodeReadFileOptions> = {
	encoding: null,
	flag: "r",
	signal: null,
};
