import type { Socket as DgramSocket } from "node:dgram";

import type {
	Transport,
	TransportHandlers,
	TransportMode,
} from "@ac-kit/net-core";

/** Construction options for {@link DatagramTransport}. */
export interface DatagramTransportOptions {
	/**
	 * Destination for outbound datagrams.
	 *
	 * Omit when the socket has been `connect()`ed, in which case Node supplies
	 * the destination.
	 */
	remote?: { port: number; address: string };
}

/**
 * Message-mode {@link Transport} over a UDP socket.
 *
 * Each datagram is delivered as exactly one complete frame: bytes are never
 * carried across deliveries, so a decoder returning `incomplete` means the
 * message was truncated rather than that more is coming. That distinction is
 * why {@link TransportMode} is part of the transport contract — DNS over UDP and
 * DNS over TCP share a codec but must not share buffering behaviour.
 *
 * Correlation is the caller's problem, and cannot be positional: pair this with
 * a `KeyedRegistry` over the protocol's transaction identifier.
 */
export class DatagramTransport implements Transport {
	readonly mode: TransportMode = "message";

	private readonly remote?: { port: number; address: string };

	private onMessage: ((message: Buffer) => void) | null = null;
	private onClose: (() => void) | null = null;
	private onError: ((error: unknown) => void) | null = null;
	private paused = false;
	private readonly backlog: Buffer[] = [];

	constructor(
		private readonly socket: DgramSocket,
		options?: DatagramTransportOptions,
	) {
		this.remote = options?.remote;
	}

	start(handlers: TransportHandlers): void {
		if (this.onMessage) {
			throw new Error("Transport already started");
		}

		this.onMessage = (message: Buffer) => {
			if (this.paused) {
				this.backlog.push(message);
				return;
			}
			handlers.data(message);
		};
		this.onClose = () => handlers.close();
		this.onError = (error: unknown) => handlers.error(error);

		this.socket.on("message", this.onMessage);
		this.socket.on("close", this.onClose);
		this.socket.on("error", this.onError);
	}

	stop(): void {
		if (this.onMessage) {
			this.socket.off("message", this.onMessage);
		}
		if (this.onClose) {
			this.socket.off("close", this.onClose);
		}
		if (this.onError) {
			this.socket.off("error", this.onError);
		}
		this.onMessage = null;
		this.onClose = null;
		this.onError = null;
		this.backlog.length = 0;
	}

	write(buffers: readonly Buffer[], signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) {
			return Promise.reject(
				new Error("Send aborted before it was issued", {
					cause: signal.reason,
				}),
			);
		}

		// A datagram is atomic, so fragments must be joined rather than written
		// in sequence as they would be on a stream transport.
		const payload =
			buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers as Buffer[]);

		const { promise, resolve, reject } = Promise.withResolvers<void>();
		const callback = (error: Error | null) => {
			if (error) {
				reject(new Error("Datagram send failed", { cause: error }));
			} else {
				resolve();
			}
		};

		if (this.remote) {
			this.socket.send(
				payload,
				this.remote.port,
				this.remote.address,
				callback,
			);
		} else {
			this.socket.send(payload, callback);
		}

		return promise;
	}

	pause(): void {
		this.paused = true;
	}

	resume(): void {
		this.paused = false;
		// Datagrams cannot be un-received, so they are held rather than dropped.
		while (!this.paused && this.backlog.length > 0) {
			const message = this.backlog.shift()!;
			this.onMessage?.(message);
		}
	}

	end(): Promise<void> {
		return Promise.resolve();
	}

	destroy(): void {
		this.socket.close();
	}
}
