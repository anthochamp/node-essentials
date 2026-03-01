import * as dgram from "node:dgram";
import type * as net from "node:net";
import type { Except, TypedArray } from "type-fest";
import { EventDispatcherMapBase } from "../../async/events/_event-dispatcher-map-base.js";
import type { IEventDispatcherMap } from "../../async/events/ievent-dispatcher-map.js";
import type { IError } from "../../ecma/error/error.js";
import { isNodeErrorWithCode } from "../error/node-error.js";
import { composeInetAddress, type InetEndpoint } from "./inet.js";

/**
 * Event map for DgramSocket socket-specific events.
 */
export type DgramSocketEvents = {
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
};

export interface DgramSocketStat {
	/**
	 * The number of datagrams currently queued for sending.
	 */
	sendQueueCount: number;

	/**
	 * The total number of bytes currently queued for sending.
	 */
	sendQueueSize: number;
}

/**
 * High-level wrapper around Node.js {@link dgram.Socket | UDP datagram sockets}.
 *
 * This class delegates almost all behavior to an underlying {@link dgram.Socket}
 * instance while:
 *
 * - Providing strongly-typed events via {@link DgramSocketEvents}.
 * - Using {@link InetEndpoint} instead of Node's `RemoteInfo`.
 * - Exposing promise-based {@link DgramSocket.bind | bind} and
 *   {@link DgramSocket.close | close} helpers.
 * - Aggregating send-queue statistics through {@link DgramSocket.getStat}.
 *
 * Unless explicitly documented otherwise, methods have the same semantics as
 * their counterparts on {@link dgram.Socket}.
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
export class DgramSocket
	extends EventDispatcherMapBase<DgramSocketEvents>
	implements IEventDispatcherMap<DgramSocketEvents>
{
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
	 * Enables or disables sending of broadcast datagrams.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setBroadcast}, which
	 * toggles the `SO_BROADCAST` socket option. When enabled, UDP packets may be
	 * sent to broadcast addresses.
	 *
	 * @param flag Whether broadcast should be enabled.
	 */
	setBroadcast(flag: boolean): void {
		this.sock.setBroadcast(flag);
	}

	/**
	 * Adds this socket to the given multicast group.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.addMembership}, which
	 * configures `IP_ADD_MEMBERSHIP` for the given multicast group.
	 */
	addMembership(multicastAddress: string, multicastInterface?: string): void {
		this.sock.addMembership(multicastAddress, multicastInterface);
	}

	/**
	 * Sets the size in bytes of the underlying receive buffer.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setRecvBufferSize}, which
	 * sets the `SO_RCVBUF` socket option.
	 */
	setRecvBufferSize(size: number): void {
		this.sock.setRecvBufferSize(size);
	}

	/**
	 * Returns the size in bytes of the underlying receive buffer.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.getRecvBufferSize}, which
	 * reads the `SO_RCVBUF` socket option.
	 */
	getRecvBufferSize(): number {
		return this.sock.getRecvBufferSize();
	}

	/**
	 * Sets the size in bytes of the underlying send buffer.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setSendBufferSize}, which
	 * sets the `SO_SNDBUF` socket option.
	 */
	setSendBufferSize(size: number): void {
		this.sock.setSendBufferSize(size);
	}

	/**
	 * Returns the size in bytes of the underlying send buffer.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.getSendBufferSize}, which
	 * reads the `SO_SNDBUF` socket option.
	 */
	getSendBufferSize(): number {
		return this.sock.getSendBufferSize();
	}

	/**
	 * Removes this socket from the given multicast group.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.dropMembership}, which
	 * configures `IP_DROP_MEMBERSHIP` for the given multicast group.
	 */
	dropMembership(multicastAddress: string, multicastInterface?: string): void {
		this.sock.dropMembership(multicastAddress, multicastInterface);
	}

	/**
	 * Adds this socket to a source-specific multicast group.
	 *
	 * This is a thin wrapper around
	 * {@link dgram.Socket.addSourceSpecificMembership}, configuring
	 * source-specific multicast membership for the given source and group.
	 */
	addSourceMembership(
		sourceAddress: string,
		groupAddress: string,
		multicastInterface?: string,
	): void {
		this.sock.addSourceSpecificMembership(
			sourceAddress,
			groupAddress,
			multicastInterface,
		);
	}

	/**
	 * Removes this socket from a source-specific multicast group.
	 *
	 * This is a thin wrapper around
	 * {@link dgram.Socket.dropSourceSpecificMembership}, removing
	 * source-specific multicast membership for the given source and group.
	 */
	dropSourceMembership(
		sourceAddress: string,
		groupAddress: string,
		multicastInterface?: string,
	): void {
		this.sock.dropSourceSpecificMembership(
			sourceAddress,
			groupAddress,
			multicastInterface,
		);
	}

	/**
	 * Sets the outbound multicast interface.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setMulticastInterface},
	 * which controls the default outgoing interface for multicast traffic.
	 */
	setMulticastInterface(multicastInterface: string): void {
		this.sock.setMulticastInterface(multicastInterface);
	}

	/**
	 * Enables or disables loopback for multicast packets sent from this socket.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setMulticastLoopback},
	 * which toggles the `IP_MULTICAST_LOOP` socket option.
	 */
	setMulticastLoop(flag: boolean): void {
		this.sock.setMulticastLoopback(flag);
	}

	/**
	 * Sets the time-to-live (TTL) value for multicast packets.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setMulticastTTL}, which
	 * configures the `IP_MULTICAST_TTL` socket option.
	 */
	setMulticastTtl(ttl: number): void {
		this.sock.setMulticastTTL(ttl);
	}

	/**
	 * Sets the unicast time-to-live (TTL) value for outgoing packets.
	 *
	 * This is a thin wrapper around {@link dgram.Socket.setTTL}, which
	 * configures the `IP_TTL` socket option.
	 */
	setTtl(ttl: number): void {
		this.sock.setTTL(ttl);
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
	 * Returns statistics about the underlying send queue.
	 *
	 * This wraps {@link dgram.Socket.getSendQueueCount} and
	 * {@link dgram.Socket.getSendQueueSize} into a single object.
	 */
	getStat(): DgramSocketStat {
		return {
			sendQueueCount: this.sock.getSendQueueCount(),
			sendQueueSize: this.sock.getSendQueueSize(),
		};
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

	private setupEventForwarding(): void {
		this.sock.on("close", () => {
			this.dispatch("close");
		});

		this.sock.on("connect", () => {
			this.dispatch("connect");
		});

		this.sock.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.dispatch("error", err);
		});

		this.sock.on("listening", () => {
			this.dispatch("listening");
		});

		this.sock.on("message", (msg, rinfo) => {
			const from: InetEndpoint = {
				...composeInetAddress(rinfo.family, rinfo.address),
				port: rinfo.port,
			};
			this.dispatch("message", msg, rinfo.size, from);
		});
	}
}
