import * as tls from "node:tls";

import { type IError } from "@ac-kit/core";

import { TcpServer, type TcpServerEvents } from "./tcp-server.js";
import { TlsSocket, type TlsSecureContext } from "./tls-socket.js";

/** Event map for {@link TlsServer}. */
export type TlsServerEvents = TcpServerEvents & {
	/** Emitted once a connection completed its TLS handshake. */
	secureConnection: [socket: TlsSocket];

	/**
	 * Emitted when a connection failed its TLS handshake. The socket is already
	 * unusable; the event only reports why the client was rejected.
	 */
	tlsClientError: [error: IError, socket: TlsSocket];

	/** Emitted with each line of TLS key material, for traffic decryption. */
	keylog: [line: Buffer, socket: TlsSocket];
};

/** Options accepted by {@link TlsServer.from}. */
export type TlsServerOptions = tls.TlsOptions;

/**
 * TLS server accepting encrypted incoming connections.
 *
 * Example usage:
 *
 * ```ts
 * const server = TlsServer.from({ key, cert });
 * server.subscribe("secureConnection", (socket) => {
 * 	console.log("Client cipher:", socket.getCipher().name);
 * });
 * await server.listen(8443, "0.0.0.0");
 * // ... later
 * await server.close();
 * ```
 *
 * Every event of {@link TcpServer} is still emitted, so
 * {@link TcpServerEvents.connection} reports the plaintext socket accepted
 * _before_ the handshake. Wait for {@link TlsServerEvents.secureConnection} to
 * read or write application data.
 *
 * The session-resumption events Node.js exposes with a completion callback
 * (`newSession`, `resumeSession` and `OCSPRequest`) are deliberately not
 * forwarded: Node.js falls back to its default behaviour only while no listener
 * is attached, so forwarding them would stall every handshake that nobody
 * subscribed to.
 */
export class TlsServer extends TcpServer<tls.Server, TlsServerEvents> {
	/**
	 * Creates a new {@link TlsServer} instance.
	 *
	 * @param options Options for creating the underlying Node.js server,
	 *   including the certificate chain and private key to serve.
	 * @returns A new `TlsServer` instance.
	 */
	static override from(options?: TlsServerOptions): TlsServer {
		return new TlsServer(tls.createServer(options ?? {}));
	}

	/**
	 * Adds a secure context to serve when a client requests `hostname` through
	 * SNI.
	 *
	 * @param hostname The server name to match, which may contain wildcards.
	 * @param context The secure context or the options to build one from.
	 */
	addContext(hostname: string, context: TlsSecureContext): void {
		this.server.addContext(hostname, context);
	}

	/**
	 * Replaces the default secure context, affecting connections established
	 * after the call.
	 *
	 * @param context The options to build the secure context from.
	 */
	setSecureContext(context: tls.SecureContextOptions): void {
		this.server.setSecureContext(context);
	}

	/**
	 * Returns the keys used to encrypt session tickets.
	 *
	 * Sharing them across server instances lets clients resume a session on any
	 * of them; they are sensitive key material and must be handled as secrets.
	 *
	 * @returns The 48-byte session ticket keys.
	 */
	getTicketKeys(): Buffer {
		return this.server.getTicketKeys();
	}

	/**
	 * Sets the keys used to encrypt session tickets, affecting connections
	 * established after the call.
	 *
	 * @param keys The 48-byte session ticket keys.
	 */
	setTicketKeys(keys: Buffer): void {
		this.server.setTicketKeys(keys);
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.server.on("secureConnection", (socket) => {
			this.dispatch("secureConnection", [wrap_(socket)]);
		});

		this.server.on("tlsClientError", (error, socket) => {
			this.dispatch("tlsClientError", [error, wrap_(socket)]);
		});

		this.server.on("keylog", (line, socket) => {
			this.dispatch("keylog", [line, wrap_(socket)]);
		});
	}
}

/** Keeps one wrapper per accepted socket, so subscribers can correlate events. */
const wrappers_ = new WeakMap<tls.TLSSocket, TlsSocket>();

function wrap_(socket: tls.TLSSocket): TlsSocket {
	let wrapper = wrappers_.get(socket);

	if (wrapper === undefined) {
		wrapper = new TlsSocket(socket);
		wrappers_.set(socket, wrapper);
	}

	return wrapper;
}
