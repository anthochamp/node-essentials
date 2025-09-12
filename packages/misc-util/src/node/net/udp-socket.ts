import * as dgram from "node:dgram";
import type { Except, TypedArray } from "type-fest";
import type { IError } from "../../ecma/error/error.js";

/**
 * A wrapper around `dgram.Socket` that provides Promise-based methods for
 * binding, closing, and sending data.
 *
 * This class simplifies the use of UDP sockets by converting the callback-based
 * methods of `dgram.Socket` into Promise-based methods, making it easier to use
 * with async/await syntax.
 *
 * Example usage:
 * ```ts
 * const udpSocket = new UdpSocket.from({ type: "udp4" });
 * await udpSocket.bind({ address: "localhost", port: 12345 });
 * await udpSocket.send(Buffer.from("Hello, UDP!"), 0, 13, 54321, "localhost");
 * await udpSocket.close();
 * ```
 */
export class UdpSocket {
	/**
	 * Creates a new `UdpSocket` instance with the specified options.
	 */
	static from(options?: dgram.SocketOptions): UdpSocket {
		return new UdpSocket(dgram.createSocket(options || { type: "udp4" }));
	}

	/**
	 * Constructs a new `UdpSocket` instance wrapping the provided `dgram.Socket`.
	 */
	constructor(private readonly sock: dgram.Socket) {}

	get socket(): Omit<dgram.Socket, "bind" | "close" | "send"> {
		return this.sock;
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
				reject(error);
			};
			this.sock.once("error", handleError);

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
				reject(error);
			};
			this.sock.once("error", handleError);

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
}
