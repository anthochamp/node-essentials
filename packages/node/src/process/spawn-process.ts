import { BYTES_PER_MIB } from "@ac-kit/core";

import { ProcessExitWithOutputError } from "../error/process-exit-error.js";
import { type StartProcessOptions, startProcess } from "./start-process.js";

/** Which of the child's streams are buffered into a {@link ProcessResult}. */
export type ProcessCapture = "both" | "stdout" | "stderr" | "none";

export type SpawnProcessOptions = StartProcessOptions & {
	/** Default `"utf8"`. */
	readonly encoding?: BufferEncoding | null;

	/** Per-stream cap on what is buffered. Default 8 MiB. */
	readonly maxBuffer?: number | null;

	/** Default `"both"`. */
	readonly capture?: ProcessCapture | null;

	/** Throw on a non-zero exit code or a terminating signal. Default `true`. */
	readonly throwOnNonZero?: boolean | null;
};

export type ProcessResult = {
	code: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
	durationMs: number;
};

/**
 * Runs a command to completion and returns what it printed.
 *
 * The one-shot form of {@link startProcess}: no handle is exposed, so streaming
 * consumers pass `onOutput` instead of subscribing.
 *
 * @param command The executable to run.
 * @param args Arguments passed to it verbatim.
 * @param options Capture limits and everything {@link StartProcessOptions}
 *   accepts.
 * @returns The exit status and the captured streams.
 * @throws {ProcessExitWithOutputError} On a non-zero exit, unless
 *   `throwOnNonZero` is `false`.
 * @throws {RangeError} When either stream exceeds `maxBuffer`.
 */
export async function spawnProcess(
	command: string,
	args?: readonly string[],
	options?: SpawnProcessOptions,
): Promise<ProcessResult> {
	const encoding = options?.encoding ?? "utf8";
	const maxBuffer = options?.maxBuffer ?? 8 * BYTES_PER_MIB;
	const capture = options?.capture ?? "both";
	const throwOnNonZero = options?.throwOnNonZero ?? true;

	const capturesStdout = capture === "both" || capture === "stdout";
	const capturesStderr = capture === "both" || capture === "stderr";
	const streams = Boolean(options?.onOutput);

	const spawned = await startProcess(command, args, {
		...options,
		// An unread pipe fills and blocks the child, so nothing is piped in vain.
		stdout: options?.stdout ?? (capturesStdout || streams ? "pipe" : "ignore"),
		stderr: options?.stderr ?? (capturesStderr || streams ? "pipe" : "ignore"),
	});

	let stdout = "";
	let stderr = "";
	let overflowError: RangeError | null = null;

	const collect = (
		source: NodeJS.ReadableStream | null,
		name: "stdout" | "stderr",
		append: (text: string) => void,
	): void => {
		if (!source) {
			return;
		}

		let bytes = 0;
		source.on("data", (chunk: Buffer) => {
			bytes += chunk.length;
			if (bytes <= maxBuffer) {
				append(chunk.toString(encoding));
				return;
			}
			if (!overflowError) {
				overflowError = new RangeError(
					`${name} maxBuffer (${maxBuffer} bytes) exceeded`,
				);
				spawned.kill();
			}
		});
	};

	if (capturesStdout) {
		collect(spawned.nodeStdout_, "stdout", (text) => {
			stdout += text;
		});
	}
	if (capturesStderr) {
		collect(spawned.nodeStderr_, "stderr", (text) => {
			stderr += text;
		});
	}

	const exit = await spawned.waitForExit();

	options?.signal?.throwIfAborted();

	if (overflowError) {
		throw overflowError;
	}

	if (throwOnNonZero && exit.code !== 0) {
		throw new ProcessExitWithOutputError(
			exit.code,
			exit.signal,
			exit.signal !== null,
			stdout,
			stderr,
		);
	}

	return { ...exit, stdout, stderr };
}
