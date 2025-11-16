import * as dgram from "node:dgram";
import { EventEmitter } from "node:events";
import type * as net from "node:net";
import type { Except, TypedArray } from "type-fest";
import type { IError } from "../../ecma/error/error.js";
import { isNodeErrorWithCode } from "../error/node-error.js";
import { composeInetAddress, type InetEndpoint } from "./inet.js";

/**
 * Event map for DgramSocket socket-specific events.
 */
export interface DgramSocketEvents {
	/**
	 * Emitted when the socket is closed.
	 */
	close: [];

	/**
	 * Emitted after a socket is addressed using `bind()`.
	 */
	connect: [];

	/**
	 * Emitted when an error occurs.
	 */
	error: [error: IError];

	/**
	 * Emitted when the socket is ready to receive data.
	 */
	listening: [];

	/**
	 * Emitted when a new datagram is available on a socket.
	 * @param msg - The message buffer received
	 * @param msgSize - The size of the message in bytes
	 * @param from - The sender's endpoint information (address, port, and family)
	 */
	message: [msg: Buffer, msgSize: number, from: InetEndpoint];
}

/**
 * Datagram (UDP) socket wrapper.
 *
 * Example usage:
 * ```ts
 * const dgramSocket = DgramSocket.from({ type: "udp4" });
 * await dgramSocket.bind(12345, "localhost");
 * dgramSocket.on("message", (msg, msgSize, from) => {
 *   console.log(`Received ${msgSize} bytes from ${from.address}:${from.port}`);
 * });
 * await dgramSocket.send(54321, "localhost", Buffer.from("Hello, UDP!"));
 * await dgramSocket.close();
 * ```
 */
export class DgramSocket extends EventEmitter<DgramSocketEvents> {
	/**
	 * Creates a new `DgramSocket` instance with the specified options.
	 */
	static from(options?: dgram.SocketOptions): DgramSocket {
		return new DgramSocket(dgram.createSocket(options || { type: "udp4" }));
	}

	private readonly handledErrorEvents: Set<IError> = new Set();

	/**
	 * Constructs a new `DgramSocket` instance wrapping the provided `dgram.Socket`.
	 */
	constructor(private readonly sock: dgram.Socket) {
		super();
		this.setupEventForwarding();
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
	 * Gets the address information of the bound socket.
	 *
	 * @returns The socket's endpoint information or null if the socket is not bound.
	 * @throws {UnsupportedError} If the address type is not an AddressInfo object.
	 */
	address(): InetEndpoint | null {
		let addr: net.AddressInfo;
		try {
			addr = this.sock.address();
		} catch (error) {
			// dgram throws "Not running" error when socket is not bound/closed
			if (
				isNodeErrorWithCode(error, "EBADF") ||
				(error instanceof Error && error.message === "Not running")
			) {
				return null;
			}

			throw error;
		}

		return {
			...composeInetAddress(addr.family, addr.address),
			port: addr.port,
		};
	}

	/**
	 * Binds the UDP socket to the specified address and port.
	 *
	 * @param port The port to bind to. If not specified, a random available port will be used.
	 * @param address The address to bind to. If not specified, the socket will bind to all available interfaces.
	 * @param options Binding options.
	 * @returns A promise that resolves when the socket is successfully bound.
	 */
	bind(
		port: number = 0,
		address?: string,
		options?: Except<dgram.BindOptions, "address" | "port">,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			this.sock.prependOnceListener("error", handleError);

			try {
				this.sock.bind(
					{
						...options,
						address,
						port,
					},
					() => {
						this.sock.removeListener("error", handleError);
						resolve();
					},
				);
			} catch (error) {
				this.sock.removeListener("error", handleError);
				reject(error);
			}
		});
	}

	/**
	 * Closes the UDP socket.
	 *
	 * @returns A promise that resolves when the socket is successfully closed.
	 */
	close(): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			this.sock.prependOnceListener("error", handleError);

			this.sock.close(() => {
				this.sock.removeListener("error", handleError);
				resolve();
			});
		});
	}

	/**
	 * Sends a message to the specified address and port.
	 *
	 * The msg argument contains the message to be sent. Depending on its type,
	 * different behavior can apply. If msg is a Buffer, any TypedArray or a DataView,
	 * the offset and length specify the offset within the Buffer where the message
	 * begins and the number of bytes in the message, respectively.
	 *
	 * If msg is a String, then it is automatically converted to a Buffer with
	 * 'utf8' encoding.
	 *
	 * With messages that contain multi-byte characters, offset and length will be
	 * calculated with respect to byte length and not the character position.
	 * If msg is an array, offset and length must not be specified.
	 *
	 * @param port The destination port.
	 * @param address The destination address.
	 * @param msg The message to send. This can be a `Buffer`, `TypedArray`, or `DataView`.
	 * @param offset Optional offset in the message buffer to start sending from.
	 * @param length Optional number of bytes to send from the message buffer.
	 * @returns A promise that resolves with the number of bytes sent.
	 */
	send(
		port: number,
		address: string,
		msg: string | TypedArray | DataView,
		offset?: number,
		length?: number,
	): Promise<number> {
		return new Promise((resolve, reject) => {
			const callback = (error: IError | null, bytes: number) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(bytes);
			};

			if (offset === undefined || length === undefined) {
				this.sock.send(msg, port, address, callback);
				return;
			}

			this.sock.send(msg, offset, length, port, address, callback);
		});
	}

	/**
	 * Sets up event forwarding from the underlying socket to this EventEmitter.
	 */
	private setupEventForwarding(): void {
		this.sock.on("close", () => {
			this.emit("close");
		});

		this.sock.on("connect", () => {
			this.emit("connect");
		});

		this.sock.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.emit("error", err);
		});

		this.sock.on("listening", () => {
			this.emit("listening");
		});

		this.sock.on("message", (msg, rinfo) => {
			const from: InetEndpoint = {
				...composeInetAddress(rinfo.family, rinfo.address),
				port: rinfo.port,
			};
			this.emit("message", msg, rinfo.size, from);
		});
	}
}
