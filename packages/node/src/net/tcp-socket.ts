import * as net from "node:net";

import type { Except } from "type-fest";

import { InetSocket, type InetSocketEvents } from "./inet-socket.js";

/** Event map for {@link TcpSocket}. */
export type TcpSocketEvents = InetSocketEvents;

/** Options accepted by {@link TcpSocket.from}. */
export type TcpSocketOptions = Except<net.SocketConstructorOpts, "fd">;

/** Options accepted by {@link TcpSocket.connect}. */
export type TcpSocketConnectOptions = Except<
	net.TcpSocketConnectOpts,
	"port"
> & {
	/** Aborts the connection attempt and destroys the socket. */
	signal?: AbortSignal;
};

/**
 * TCP socket for establishing connections to TCP servers.
 *
 * Example usage:
 *
 * ```ts
 * const socket = TcpSocket.from();
 * await socket.connect(80, { host: "example.com" });
 * await socket.write(
 * 	Buffer.from("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"),
 * );
 * await socket.end({ waitForClose: true });
 * ```
 */
export class TcpSocket<
	TSocket extends net.Socket = net.Socket,
	TEvents extends TcpSocketEvents = TcpSocketEvents,
> extends InetSocket<TSocket, TEvents> {
	/**
	 * Creates a new {@link TcpSocket} instance.
	 *
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new `TcpSocket` instance.
	 */
	static override from(options?: TcpSocketOptions): TcpSocket {
		return new TcpSocket(new net.Socket(options));
	}

	/**
	 * Establishes a TCP connection to the specified port.
	 *
	 * @param port The port to connect to.
	 * @param options Connection options, including the host (defaults to
	 *   `localhost`) and an optional abort signal.
	 * @returns A promise that resolves when the connection is established.
	 * @throws When the connection fails, when the socket closes before
	 *   connecting, or when the signal is aborted.
	 */
	connect(port: number, options?: TcpSocketConnectOptions): Promise<void> {
		const { signal, ...connectOptions } = options ?? {};

		return this.awaitReady("connect", {
			signal,
			start: () => {
				this.socket.connect({
					...connectOptions,
					port,
				});
			},
		});
	}
}
