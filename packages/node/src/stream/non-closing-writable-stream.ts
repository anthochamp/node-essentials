import { Writable } from "node:stream";

/**
 * Create a `WritableStream<string>` that wraps a Node `Writable` but never
 * closes it.
 *
 * `Writable.toWeb(stream).getWriter().close()` ends the underlying stream,
 * which never resolves for `process.stdout`/`process.stderr` on a TTY (a
 * well-known Node limitation — closing a WHATWG-wrapped TTY writable hangs
 * forever, reproduced with nothing more than `Writable.toWeb(process.stdout)` +
 * `writer.close()`). Use this instead of `Writable.toWeb` directly for any
 * stream whose lifecycle isn't the caller's to end.
 */
export function nonClosingWritableStream(
	stream: Writable,
): WritableStream<string> {
	const inner = Writable.toWeb(stream).getWriter();

	return new WritableStream<string>({
		write: (chunk) => inner.write(chunk),
		abort: (reason) => inner.abort(reason),
	});
}
