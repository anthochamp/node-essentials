import * as net from "node:net";

import type { Except } from "type-fest";

import { StreamSocket, type StreamSocketEvents } from "./stream-socket.js";

/**
 * Event map for {@link IpcSocket}.
 *
 * A local endpoint has no name resolution and no connection-attempt fan-out, so
 * it adds nothing to {@link StreamSocketEvents}.
 */
export type IpcSocketEvents = StreamSocketEvents;

/** Options accepted by {@link IpcSocket.from} and {@link IpcSocket.fromFd}. */
export type IpcSocketOptions = Except<net.SocketConstructorOpts, "fd">;

/** Options accepted by {@link IpcSocket.connect}. */
export type IpcSocketConnectOptions = Except<
	net.IpcSocketConnectOpts,
	"path"
> & {
	/** Aborts the connection attempt and destroys the socket. */
	signal?: AbortSignal;
};

/**
 * Stream socket over a Unix domain socket or a Windows named pipe.
 *
 * Example usage:
 *
 * ```ts
 * const socket = IpcSocket.from();
 * await socket.connect("/var/run/app.sock");
 * await socket.write(Buffer.from("ping\n"));
 * await socket.end({ waitForClose: true });
 * ```
 *
 * A pipe inherited from a parent process is already connected and is adopted
 * through {@link IpcSocket.fromFd} instead.
 */
export class IpcSocket<
	TSocket extends net.Socket = net.Socket,
	TEvents extends IpcSocketEvents = IpcSocketEvents,
> extends StreamSocket<TSocket, TEvents> {
	/**
	 * Creates a new {@link IpcSocket} instance.
	 *
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new `IpcSocket` instance.
	 */
	static override from(options?: IpcSocketOptions): IpcSocket {
		return new IpcSocket(new net.Socket(options));
	}

	/**
	 * Adopts an already-open file descriptor, such as a pipe inherited from a
	 * parent process. The returned socket is connected and needs no
	 * {@link IpcSocket.connect} call.
	 *
	 * The descriptor is adopted as bidirectional; pass `readable` or `writable`
	 * to adopt a one-way pipe, since Node.js disables both by default for a
	 * descriptor-backed socket.
	 *
	 * @param fd The open file descriptor to adopt.
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new, already connected `IpcSocket` instance.
	 */
	static fromFd(fd: number, options?: IpcSocketOptions): IpcSocket {
		return new IpcSocket(
			new net.Socket({ readable: true, writable: true, ...options, fd }),
		);
	}

	/**
	 * Connects to the endpoint listening on the given path.
	 *
	 * @param path Filesystem path of the Unix domain socket, or the name of the
	 *   Windows named pipe.
	 * @param options Connection options, including an optional abort signal.
	 * @returns A promise that resolves when the connection is established.
	 * @throws When the connection fails, when the socket closes before
	 *   connecting, or when the signal is aborted.
	 */
	connect(path: string, options?: IpcSocketConnectOptions): Promise<void> {
		const { signal, ...connectOptions } = options ?? {};

		return this.awaitReady("connect", {
			signal,
			start: () => {
				this.socket.connect({
					...connectOptions,
					path,
				});
			},
		});
	}
}
