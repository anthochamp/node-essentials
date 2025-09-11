import { open, stat } from "node:fs/promises";
import { BYTES_PER_KIB } from "../../constants.js";
import { defaults } from "../../ecma/object/defaults.js";

export type FileContentEqualOptions = {
	/**
	 * The size of the buffer to use when reading the file (default: 64KiB)
	 */
	bufferSize?: number;

	/**
	 * An AbortSignal to cancel the operation.
	 */
	signal?: AbortSignal | null;
};

const DEFAULT_FILE_CONTENT_EQUAL_OPTIONS: Required<FileContentEqualOptions> = {
	bufferSize: 64 * BYTES_PER_KIB,
	signal: null,
};

/**
 * Compares the content of a file with the provided data.
 *
 * @param filePath The path to the file to compare.
 * @param data The data to compare with the file content.
 * @param options Options for the file comparison.
 * @returns True if the file content is equal to the provided data, false otherwise.
 */
export async function fileContentEqual(
	path: string,
	data: Buffer,
	options?: FileContentEqualOptions,
): Promise<boolean> {
	const effectiveOptions = defaults(
		options,
		DEFAULT_FILE_CONTENT_EQUAL_OPTIONS,
	);

	if (effectiveOptions.bufferSize <= 0) {
		throw new Error("The buffer size must be greater than 0.");
	}

	const fileStat = await stat(path);
	if (fileStat.size !== data.length) {
		return false;
	}

	if (fileStat.size === 0) {
		return true;
	}

	const handle = await open(path, "r");

	let position = 0;

	try {
		const buffer = Buffer.alloc(effectiveOptions.bufferSize);

		do {
			effectiveOptions.signal?.throwIfAborted();

			const result = await handle.read(buffer, 0, buffer.length, position);

			if (result.bytesRead === 0) {
				break;
			}

			const compareResult = buffer.compare(
				data,
				position,
				position + result.bytesRead,
				0,
				result.bytesRead,
			);
			if (compareResult !== 0) {
				break;
			}

			position += result.bytesRead;
		} while (position < data.length);
	} finally {
		await handle.close();
	}

	return position === data.length;
}
