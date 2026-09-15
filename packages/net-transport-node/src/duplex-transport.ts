import type { Duplex } from "node:stream";

import type { IError } from "@ac-kit/core";
import type {
	Transport,
	TransportHandlers,
	TransportMode,
} from "@ac-kit/net-core";

/**
 * {@link Transport} over any Node duplex stream.
 *
 * Covers TCP, TLS, Unix domain sockets, child-process pipes, and in-memory
 * streams used by tests. Instances of `StreamSocket` and its subclasses expose
 * a suitable stream through their `stream` accessor.
 *
 * Writes are corked around the whole buffer list so a multi-fragment frame
 * reaches the socket as one vectored write rather than one syscall per
 * fragment.
 */
export class DuplexTransport implements Transport {
	readonly mode: TransportMode = "stream";

	private handlers: TransportHandlers | null = null;
	private onData: ((chunk: Buffer) => void) | null = null;
	private onEnd: (() => void) | null = null;
	private onClose: (() => void) | null = null;
	private onError: ((error: IError) => void) | null = null;

	/**
	 * @param stream The already-connected duplex stream to carry frames over.
	 *   Connection setup is deliberately not this class's concern.
	 */
	constructor(private readonly stream: Duplex) {}

	start(handlers: TransportHandlers): void {
		if (this.handlers) {
			throw new Error("Transport already started");
		}
		this.handlers = handlers;

		this.onData = (chunk: Buffer) => handlers.data(chunk);
		this.onEnd = () => handlers.end();
		this.onClose = () => handlers.close();
		this.onError = (error: IError) => handlers.error(error);

		this.stream.on("data", this.onData);
		this.stream.on("end", this.onEnd);
		this.stream.on("close", this.onClose);
		this.stream.on("error", this.onError);
	}

	stop(): void {
		if (this.onData) {
			this.stream.off("data", this.onData);
		}
		if (this.onEnd) {
			this.stream.off("end", this.onEnd);
		}
		if (this.onClose) {
			this.stream.off("close", this.onClose);
		}
		if (this.onError) {
			this.stream.off("error", this.onError);
		}
		this.handlers = null;
		this.onData = null;
		this.onEnd = null;
		this.onClose = null;
		this.onError = null;
	}

	write(buffers: readonly Buffer[], signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) {
			return Promise.reject(
				new Error("Write aborted before it was issued", {
					cause: signal.reason,
				}),
			);
		}
		if (buffers.length === 0) {
			return Promise.resolve();
		}

		const { promise, resolve, reject } = Promise.withResolvers<void>();

		// Declared before the write so the write callback can never observe it
		// in the temporal dead zone, even if the stream calls back synchronously.
		let accepted = true;
		let settled = false;

		const cleanup = () => {
			this.stream.off("drain", handleDrain);
			if (signal && handleAbort) {
				signal.removeEventListener("abort", handleAbort);
			}
		};
		const succeed = () => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve();
		};
		const fail = (error: Error) => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			reject(error);
		};

		const handleDrain = () => succeed();
		const handleAbort = signal
			? () =>
					fail(
						new Error(
							"Write aborted while waiting for the transport to drain",
							{ cause: signal.reason },
						),
					)
			: null;

		const handleWritten = (error?: Error | null) => {
			if (error) {
				fail(new Error("Transport write failed", { cause: error }));
			} else if (accepted) {
				succeed();
			}
			// Otherwise the stream is backpressured and handleDrain resolves.
		};

		if (signal && handleAbort) {
			signal.addEventListener("abort", handleAbort, { once: true });
		}

		this.stream.cork();
		for (let index = 0; index < buffers.length; index++) {
			const isLast = index === buffers.length - 1;
			const ok = this.stream.write(
				buffers[index]!,
				isLast ? handleWritten : undefined,
			);
			accepted &&= ok;
		}
		this.stream.uncork();

		if (!accepted && !settled) {
			this.stream.once("drain", handleDrain);
		}

		return promise;
	}

	pause(): void {
		this.stream.pause();
	}

	resume(): void {
		this.stream.resume();
	}

	end(): Promise<void> {
		const { promise, resolve, reject } = Promise.withResolvers<void>();
		this.stream.end((error?: Error | null) => {
			if (error) {
				reject(new Error("Transport end failed", { cause: error }));
			} else {
				resolve();
			}
		});
		return promise;
	}

	destroy(error?: Error): void {
		// destroy(err) re-emits the error, and our handler may already be detached;
		// without an absorbing listener Node escalates it to an uncaught exception.
		this.stream.on("error", noop);
		this.stream.destroy(error);
	}
}

function noop(): void {}
