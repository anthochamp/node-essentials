import * as net from "node:net";
import type { Except } from "type-fest";
import type { IError } from "../../ecma/error/error.js";
import { composeInetAddress, type InetEndpoint } from "./inet.js";
import { StreamSocket, type StreamSocketEvents } from "./stream-socket.js";

/**
 * Event map for IpcSocket socket-specific events.
 */
export type IpcSocketEvents = StreamSocketEvents & {
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
};

/**
 */
export class IpcSocket<
	TSock extends net.Socket = net.Socket,
	TEvents extends IpcSocketEvents = IpcSocketEvents,
> extends StreamSocket<TSock, TEvents> {
	/**
	 * Creates a new {@link IpcSocket} instance.
	 *
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new `StreamSocket` instance.
	 */
	static override from(options?: net.SocketConstructorOpts): IpcSocket {
		return new IpcSocket(new net.Socket(options));
	}

	constructor(sock: TSock) {
		super(sock);
		this.setupEventForwarding();
	}

	/**
	 *
	 */
	connect(
		path: string,
		options?: Except<net.IpcSocketConnectOpts, "path">,
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
					path,
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
	}
}
