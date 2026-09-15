import type { Writable } from "node:stream";

/**
 * Writes `chunk` to `stream`, resolving once the write completes (or rejecting
 * on error).
 *
 * Only wraps the write callback — a stream that fails also emits its own
 * `"error"` event, and an unhandled one crashes the process; attaching a
 * listener for that is the stream owner's job for the stream's whole lifetime,
 * not this per-write helper's.
 */
export function nodeWriteAsync(
	stream: Writable,
	chunk: string | Uint8Array,
): Promise<void> {
	return new Promise((resolve, reject) => {
		stream.write(chunk, (error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}
