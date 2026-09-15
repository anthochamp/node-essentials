import type { ISink, SerializeReportEventOptions } from "@ac-kit/app-report";
import { createMessageSink } from "@ac-kit/app-report";

export type ChildProcessMessageSinkOptions = {
	readonly serialize?: SerializeReportEventOptions;
	/**
	 * Called when the IPC channel refuses a message (typically because it has
	 * closed). Without it a delivery failure is silent, which for a measurement
	 * stream is data loss with no signal.
	 */
	readonly onSendError?: (error: unknown) => void;
};

/** The subset of `process`/`ChildProcess` a message sink needs. */
export type MessageTarget = {
	send?: (message: unknown, callback: (error: unknown) => void) => boolean;
};

/**
 * Binds a Node IPC channel to `@ac-kit/app-report`'s portable
 * `createMessageSink`: pass `process` in a forked child, or the child handle in
 * the parent.
 */
export function createChildProcessMessageSink<TData>(
	target: MessageTarget,
	options?: ChildProcessMessageSinkOptions,
): ISink<TData> {
	return createMessageSink<TData>(
		(message) => {
			target.send?.(message, (error) => {
				if (error) {
					options?.onSendError?.(error);
				}
			});
		},
		{ serialize: options?.serialize },
	);
}
