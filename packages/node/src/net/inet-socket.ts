import * as net from "node:net";

import {
	composeInetAddress,
	type InetAddress,
	type InetEndpoint,
} from "@ac-kit/core";

import { StreamSocket, type StreamSocketEvents } from "./stream-socket.js";

/** Event map for sockets running over an IP transport. */
export type InetSocketEvents = StreamSocketEvents & {
	/**
	 * Emitted when a new connection attempt is started. May be emitted multiple
	 * times if family autoselection is enabled.
	 */
	connectionAttempt: [endpoint: InetEndpoint];

	/**
	 * Emitted when a connection attempt failed. May be emitted multiple times if
	 * family autoselection is enabled.
	 */
	connectionAttemptFailed: [endpoint: InetEndpoint, error: Error];

	/**
	 * Emitted when a connection attempt timed out. May be emitted multiple times
	 * if family autoselection is enabled.
	 */
	connectionAttemptTimeout: [endpoint: InetEndpoint];

	/** Emitted after resolving the host name but before connecting. */
	lookup: [error: Error | null, address: InetAddress, host: string];
};

/**
 * Base class for sockets whose transport is an IP connection.
 *
 * On top of {@link StreamSocket} it exposes the endpoint accessors and the
 * socket options that only make sense over IP, plus the connection-attempt and
 * name-resolution events Node.js emits while dialling.
 *
 * It is shared by {@link TcpSocket} and {@link TlsSocket}: both run over IP, but
 * they establish their connection differently, so neither can be expressed as a
 * subclass of the other.
 */
export class InetSocket<
	TSocket extends net.Socket = net.Socket,
	TEvents extends InetSocketEvents = InetSocketEvents,
> extends StreamSocket<TSocket, TEvents> {
	/**
	 * Remote endpoint of the socket, or `null` while it is not connected.
	 *
	 * @throws {UnsupportedError} If the socket family is not IPv4 or IPv6.
	 */
	get remoteEndpoint(): InetEndpoint | null {
		const address = this.socket.remoteAddress;
		const port = this.socket.remotePort;
		const family = this.socket.remoteFamily;

		if (address === undefined || port === undefined || family === undefined) {
			return null;
		}

		return {
			...composeInetAddress(family, address),
			port,
		};
	}

	/**
	 * Local endpoint of the socket, or `null` while it is not connected.
	 *
	 * @throws {UnsupportedError} If the socket family is not IPv4 or IPv6.
	 */
	get localEndpoint(): InetEndpoint | null {
		const address = this.socket.localAddress;
		const port = this.socket.localPort;
		const family = this.socket.localFamily;

		if (address === undefined || port === undefined || family === undefined) {
			return null;
		}

		return {
			...composeInetAddress(family, address),
			port,
		};
	}

	/**
	 * Sets the keep-alive option for the socket.
	 *
	 * @param enable Whether to enable keep-alive.
	 * @param initialDelay The initial delay in milliseconds before the first
	 *   keep-alive probe.
	 */
	setKeepAlive(enable: boolean, initialDelay?: number): void {
		this.socket.setKeepAlive(enable, initialDelay);
	}

	/**
	 * Enables or disables the Nagle algorithm for the socket.
	 *
	 * @param noDelay Whether to disable the Nagle algorithm.
	 */
	setNoDelay(noDelay: boolean): void {
		this.socket.setNoDelay(noDelay);
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.socket.on("connectionAttempt", (ip, port, family) => {
			this.dispatch("connectionAttempt", [
				{
					...composeInetAddress(family, ip),
					port,
				},
			]);
		});

		this.socket.on("connectionAttemptFailed", (ip, port, family, error) => {
			this.dispatch("connectionAttemptFailed", [
				{
					...composeInetAddress(family, ip),
					port,
				},
				error,
			]);
		});

		this.socket.on("connectionAttemptTimeout", (ip, port, family) => {
			this.dispatch("connectionAttemptTimeout", [
				{
					...composeInetAddress(family, ip),
					port,
				},
			]);
		});

		this.socket.on("lookup", (error, address, family, host) => {
			this.dispatch("lookup", [
				error,
				composeInetAddress(family, address),
				host,
			]);
		});
	}
}
