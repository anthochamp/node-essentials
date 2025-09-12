import * as net from "node:net";
import type { Except } from "type-fest";
import type { IError } from "../../ecma/error/error.js";

/**
 * A wrapper around `net.Socket` that provides Promise-based methods for connecting,
 * ending, and writing data.
 *
 * This class simplifies the use of TCP sockets by converting the callback-based
 * methods of `net.Socket` into Promise-based methods, making it easier to use
 * with async/await syntax.
 *
 * Example usage:
 * ```ts
 * const tcpClient = new TcpClient.from();
 * await tcpClient.connect(80, "example.com");
 * await tcpClient.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
 * await tcpClient.end({ waitForClose: true });
 * ```
 */
export class TcpClient {
	/**
	 * Creates a new `TcpClient` instance with the specified options.
	 *
	 * @param options Options for creating the TCP connection. Defaults to connecting to port 80.
	 * @returns A new `TcpClient` instance.
	 */
	static from(options?: net.SocketConstructorOpts): TcpClient {
		return new TcpClient(new net.Socket(options));
	}

	constructor(private readonly sock: net.Socket) {}

	get socket(): Omit<net.Socket, "connect" | "end" | "destroy"> {
		return this.sock;
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
				reject(error);
			};
			this.sock.once("error", handleError);

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
				reject(error);
			};
			const handleEnd = () => {
				this.sock.removeListener("error", handleError);
				resolve();
			};

			this.sock.once("error", handleError);

			if (options?.waitForClose && !this.sock.closed) {
				this.sock.once("close", () => {
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
}
