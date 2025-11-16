import { EventEmitter } from "node:events";
import * as net from "node:net";
import type { Duplex } from "node:stream";
import type { Except } from "type-fest";
import type { IError } from "../../ecma/error/error.js";
import {
	composeInetAddress,
	type InetAddress,
	type InetEndpoint,
} from "./inet.js";

/**
 * Event map for TcpClient socket-specific events.
 */
export interface TcpClientEvents {
	/**
	 * Emitted when an error occurs on the socket.
	 */
	error: [error: IError];

	/**
	 * Emitted once the socket is fully closed.
	 */
	close: [hadError: boolean];

	/**
	 * Emitted when a socket connection is successfully established.
	 */
	connect: [];

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

	/**
	 * Emitted when a socket is ready to be used.
	 * Triggered immediately after 'connect'.
	 */
	ready: [];

	/**
	 * Emitted if the socket times out from inactivity.
	 * The connection is not automatically severed.
	 */
	timeout: [];
}

/**
 * TCP client for establishing connections to TCP servers.
 *
 * Example usage:
 * ```ts
 * const tcpClient = new TcpClient.from();
 * await tcpClient.connect(80, "example.com");
 * await tcpClient.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
 * await tcpClient.end({ waitForClose: true });
 * ```
 */
export class TcpClient extends EventEmitter<TcpClientEvents> {
	/**
	 * Creates a new `TcpClient` instance with the specified options.
	 *
	 * @param options Options for creating the TCP connection. Defaults to connecting to port 80.
	 * @returns A new `TcpClient` instance.
	 */
	static from(options?: net.SocketConstructorOpts): TcpClient {
		return new TcpClient(new net.Socket(options));
	}

	private readonly handledErrorEvents: Set<IError> = new Set();

	constructor(private readonly sock: net.Socket) {
		super();
		this.setupEventForwarding();
	}

	/**
	 * Returns the underlying socket stream for reading/writing data.
	 * This provides access to the socket as a Duplex stream.
	 */
	get stream(): Duplex {
		return this.sock;
	}

	/**
	 * Returns whether the socket is closed.
	 */
	get closed(): boolean {
		return this.sock.closed;
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
	 * Returns the number of bytes read from the socket.
	 */
	get bytesRead(): number {
		return this.sock.bytesRead;
	}

	/**
	 * Returns the number of bytes written to the socket.
	 */
	get bytesWritten(): number {
		return this.sock.bytesWritten;
	}

	/**
	 * Returns whether the socket is connecting.
	 */
	get connecting(): boolean {
		return this.sock.connecting;
	}

	/**
	 * Gets or sets the timeout value for the socket.
	 */
	get timeout(): number | null {
		return this.sock.timeout ?? null;
	}

	/**
	 * Sets the timeout value for the socket.
	 *
	 * @param timeout The timeout value in milliseconds. If 0, the timeout is disabled.
	 */
	set timeout(timeout: number) {
		this.sock.setTimeout(timeout);
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
	 * References the socket, preventing the process from exiting while the socket is active.
	 */
	ref(): void {
		this.sock.ref();
	}

	/**
	 * Unreferences the socket, allowing the process to exit even if the socket is active.
	 */
	unref(): void {
		this.sock.unref();
	}

	/**
	 * Establishes a TCP connection to the specified port and host.
	 *
	 * @param port The port to connect to.
	 * @param host The host to connect to.
	 * @param options Connection options.
	 * @returns A promise that resolves when the connection is successfully established.
	 */
	connect(
		port: number,
		host?: string,
		options?: Except<net.TcpNetConnectOpts, "port" | "host">,
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

	/**
	 * Half-closes the TCP connection. It sends a FIN packet to the server, indicating
	 * that no more data will be sent. The server can still send data back until it
	 * also half-closes the connection.
	 *
	 * @param options Options for disconnecting. If `waitForClose` is true, the promise
	 * will resolve only after the 'close' event is emitted.
	 * @returns A promise that resolves when the connection is half-closed or fully closed
	 * based on the provided options.
	 */
	end(options?: { waitForClose?: boolean }): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			const handleEnd = () => {
				this.sock.removeListener("error", handleError);
				resolve();
			};

			this.sock.prependOnceListener("error", handleError);

			if (options?.waitForClose && !this.sock.closed) {
				this.sock.prependOnceListener("close", () => {
					this.sock.removeListener("error", handleError);
					resolve();
				});
			}

			this.sock.end(
				options?.waitForClose && !this.sock.closed ? undefined : handleEnd,
			);
		});
	}

	/**
	 * Writes data to the TCP socket.
	 *
	 * @param data The data to write. Can be a string or a Uint8Array.
	 * @param options Optional write options, such as encoding.
	 * @returns A promise that resolves when the data is successfully written.
	 */
	write(
		data: string | Uint8Array,
		options?: { encoding?: BufferEncoding },
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const callback = (error?: IError | null) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			};

			if (options?.encoding) {
				return this.sock.write(data, options.encoding, callback);
			}

			this.sock.write(data, callback);
		});
	}

	/**
	 * Sets up event forwarding from the underlying socket to this EventEmitter.
	 */
	private setupEventForwarding(): void {
		this.sock.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.emit("error", err);
		});

		this.sock.on("close", (hadError) => {
			this.emit("close", hadError);
		});

		this.sock.on("connect", () => {
			this.emit("connect");
		});

		this.sock.on("connectionAttempt", (ip, port, family) => {
			this.emit("connectionAttempt", {
				...composeInetAddress(family, ip),
				port,
			});
		});

		this.sock.on("connectionAttemptFailed", (ip, port, family, error) => {
			this.emit(
				"connectionAttemptFailed",
				{
					...composeInetAddress(family, ip),
					port,
				},
				error,
			);
		});

		this.sock.on("connectionAttemptTimeout", (ip, port, family) => {
			this.emit("connectionAttemptTimeout", {
				...composeInetAddress(family, ip),
				port,
			});
		});

		this.sock.on("lookup", (err, address, family, host) => {
			this.emit("lookup", err, composeInetAddress(family, address), host);
		});

		this.sock.on("ready", () => {
			this.emit("ready");
		});

		this.sock.on("timeout", () => {
			this.emit("timeout");
		});
	}
}
