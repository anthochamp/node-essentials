import * as net from "node:net";
import type { Except } from "type-fest";
import type { IError } from "../../ecma/error/error.js";
import {
	composeInetAddress,
	type InetAddress,
	type InetEndpoint,
} from "./inet.js";
import { StreamSocket, type StreamSocketEvents } from "./stream-socket.js";

/**
 * Event map for TcpSocket socket-specific events.
 */
export type TcpSocketEvents = StreamSocketEvents & {
	/**
	 * Emitted when a new connection attempt is started.
	 * May be emitted multiple times if family autoselection is enabled.
	 */
	connectionAttempt: [endpoint: InetEndpoint];

	/**
	 * Emitted when a connection attempt failed.
	 * May be emitted multiple times if family autoselection is enabled.
	 */
	connectionAttemptFailed: [endpoint: InetEndpoint, error: Error];

	/**
	 * Emitted when a connection attempt timed out.
	 * May be emitted multiple times if family autoselection is enabled.
	 */
	connectionAttemptTimeout: [endpoint: InetEndpoint];

	/**
	 * Emitted after resolving the host name but before connecting.
	 */
	lookup: [err: Error | null, address: InetAddress, host: string];
};

/**
 * TCP socket for establishing connections to TCP servers.
 *
 * Example usage:
 * ```ts
 * const tcpSocket = new TcpSocket.from();
 * await tcpSocket.connect(80, "example.com");
 * await tcpSocket.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
 * await tcpSocket.end({ waitForClose: true });
 * ```
 */
export class TcpSocket<
	TSock extends net.Socket = net.Socket,
	TEvents extends TcpSocketEvents = TcpSocketEvents,
> extends StreamSocket<TSock, TEvents> {
	/**
	 * Creates a new {@link TcpSocket} instance.
	 *
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new `TcpSocket` instance.
	 */
	static override from(
		options?: Except<net.SocketConstructorOpts, "fd">,
	): TcpSocket {
		return new TcpSocket(new net.Socket(options));
	}

	constructor(sock: TSock) {
		super(sock);
		this.setupEventForwarding();
	}

	/**
	 * Returns the remote endpoint information of the socket.
	 * @throws {UnsupportedError} If the socket family is not IPv4 or IPv6.
	 */
	get remoteEndpoint(): InetEndpoint | null {
		const address = this.sock.remoteAddress;
		const port = this.sock.remotePort;
		const familyStr = this.sock.remoteFamily;

		if (
			address === undefined ||
			port === undefined ||
			familyStr === undefined
		) {
			return null;
		}

		return {
			...composeInetAddress(familyStr, address),
			port,
		};
	}

	/**
	 * Returns the local endpoint information of the socket.
	 * @throws {UnsupportedError} If the socket family is not IPv4 or IPv6.
	 */
	get localEndpoint(): InetEndpoint | null {
		const address = this.sock.localAddress;
		const port = this.sock.localPort;
		const familyStr = this.sock.localFamily;

		if (
			address === undefined ||
			port === undefined ||
			familyStr === undefined
		) {
			return null;
		}

		return {
			...composeInetAddress(familyStr, address),
			port,
		};
	}

	/**
	 * Sets the keep-alive option for the socket.
	 *
	 * @param enable Whether to enable keep-alive.
	 * @param initialDelay The initial delay in milliseconds before the first keep-alive probe.
	 */
	setKeepAlive(enable: boolean, initialDelay?: number): void {
		this.sock.setKeepAlive(enable, initialDelay);
	}

	/**
	 * Disables the Nagle algorithm for the socket.
	 *
	 * @param noDelay Whether to disable the Nagle algorithm.
	 */
	setNoDelay(noDelay: boolean): void {
		this.sock.setNoDelay(noDelay);
	}

	/**
	 * Establishes a TCP connection to the specified port and host.
	 *
	 * @param port The port to connect to.
	 * @param host The host to connect to (defaults to `localhost`).
	 * @param options Connection options.
	 * @returns A promise that resolves when the connection is successfully established.
	 */
	connect(
		port: number,
		host?: string,
		options?: Except<net.TcpSocketConnectOpts, "port" | "host">,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			this.sock.prependOnceListener("error", handleError);

			this.sock.connect(
				{
					...options,
					port,
					host,
				},
				() => {
					this.sock.removeListener("error", handleError);
					resolve();
				},
			);
		});
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.sock.on("connectionAttempt", (ip, port, family) => {
			this.dispatch("connectionAttempt", {
				...composeInetAddress(family, ip),
				port,
			});
		});

		this.sock.on("connectionAttemptFailed", (ip, port, family, error) => {
			this.dispatch(
				"connectionAttemptFailed",
				{
					...composeInetAddress(family, ip),
					port,
				},
				error,
			);
		});

		this.sock.on("connectionAttemptTimeout", (ip, port, family) => {
			this.dispatch("connectionAttemptTimeout", {
				...composeInetAddress(family, ip),
				port,
			});
		});

		this.sock.on("lookup", (err, address, family, host) => {
			this.dispatch("lookup", err, composeInetAddress(family, address), host);
		});
	}
}
