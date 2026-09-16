import type { X509Certificate } from "node:crypto";
import type { Duplex } from "node:stream";
import * as tls from "node:tls";

import { nullIfEmpty } from "@ac-kit/core";
import type { Except } from "type-fest";

import { ConnectionClosedError } from "./connection-closed-error.js";
import { InetSocket, type InetSocketEvents } from "./inet-socket.js";

/** Event map for {@link TlsSocket}. */
export type TlsSocketEvents = InetSocketEvents & {
	/** Emitted once the handshake completed and the connection is usable. */
	secureConnect: [];

	/**
	 * Emitted once the handshake completed, including after a renegotiation.
	 *
	 * Unlike {@link TlsSocketEvents.secureConnect} this also fires on sockets
	 * accepted by a server.
	 */
	secure: [];

	/**
	 * Emitted with the stapled OCSP response, or `null` when the server sent
	 * none. Only emitted when `requestOCSP` was set.
	 */
	ocspResponse: [response: Buffer | null];

	/** Emitted with each line of TLS key material, for traffic decryption. */
	keylog: [line: Buffer];

	/** Emitted with a session ticket that can be reused to resume the session. */
	session: [session: Buffer];
};

/** Options accepted by {@link TlsSocket.from}. */
export type TlsSocketOptions = Except<
	tls.TLSSocketOptions,
	"isServer" | "server"
>;

/** Options accepted by {@link TlsSocket.connect}. */
export type TlsSocketConnectOptions = Except<
	tls.ConnectionOptions,
	"port" | "path" | "socket"
> & {
	/** Aborts the connection attempt and destroys the socket. */
	signal?: AbortSignal;
};

/** Options accepted by {@link TlsSocket.renegotiate}. */
export type TlsSocketRenegotiateOptions = {
	/** Whether to reject a peer certificate that fails verification. */
	rejectUnauthorized?: boolean;

	/** Whether to request a certificate from the peer. */
	requestCert?: boolean;
};

/** A ready-made secure context, or the options to build one from. */
export type TlsSecureContext = tls.SecureContextOptions | tls.SecureContext;

/**
 * TLS socket for establishing encrypted connections to TLS servers.
 *
 * Unlike {@link TcpSocket}, a TLS connection cannot be established on an
 * existing instance: Node.js creates the socket as part of the handshake. The
 * connection therefore starts from the static {@link TlsSocket.connect}, which
 * resolves only once the handshake completed and the peer certificate has been
 * verified.
 *
 * ```ts
 * const socket = await TlsSocket.connect(443, { host: "example.com" });
 * ```
 *
 * The same method upgrades an already-connected plaintext stream, which is what
 * `STARTTLS`-style protocols need. The plaintext transport is destroyed if the
 * handshake fails, so a failed upgrade can never fall back to cleartext.
 *
 * ```ts
 * const plain = TcpSocket.from();
 * await plain.connect(587, { host: "mail.example.com" });
 * // ... negotiate STARTTLS over the plaintext connection ...
 * const secure = await TlsSocket.connect(plain.stream, {
 * 	servername: "mail.example.com",
 * });
 * ```
 *
 * Accessors that report handshake results ({@link TlsSocket.authorized},
 * {@link TlsSocket.getPeerCertificate}, {@link TlsSocket.getCipher}, …) are
 * only meaningful once the handshake completed.
 */
export class TlsSocket extends InetSocket<tls.TLSSocket, TlsSocketEvents> {
	/**
	 * Wraps an existing stream in a TLS socket without waiting for the handshake.
	 *
	 * The handshake starts immediately and its outcome is reported through the
	 * {@link TlsSocketEvents.secureConnect} and {@link StreamSocketEvents.error}
	 * events. Prefer {@link TlsSocket.connect}, which reports both through the
	 * returned promise; use this method only to drive the handshake manually.
	 *
	 * @param stream The plaintext stream to encrypt.
	 * @param options Options for the underlying Node.js TLS socket.
	 * @returns A new `TlsSocket` instance whose handshake is in progress.
	 */
	static override from(stream: Duplex, options?: TlsSocketOptions): TlsSocket {
		return new TlsSocket(new tls.TLSSocket(stream, options));
	}

	/**
	 * Connects to a TLS server and resolves once the handshake completed.
	 *
	 * @param port The port to connect to.
	 * @param options Connection options, including the host, the secure context
	 *   and an optional abort signal.
	 * @returns A promise that resolves with the connected socket.
	 */
	static connect(
		port: number,
		options?: TlsSocketConnectOptions,
	): Promise<TlsSocket>;
	/**
	 * Connects to a TLS server listening on a local endpoint and resolves once
	 * the handshake completed.
	 *
	 * @param path Filesystem path of the Unix domain socket, or the name of the
	 *   Windows named pipe.
	 * @param options Connection options, including the secure context and an
	 *   optional abort signal.
	 * @returns A promise that resolves with the connected socket.
	 */
	static connect(
		path: string,
		options?: TlsSocketConnectOptions,
	): Promise<TlsSocket>;
	/**
	 * Upgrades an already-connected stream to TLS and resolves once the handshake
	 * completed.
	 *
	 * @param stream The plaintext stream to encrypt.
	 * @param options Connection options, including the secure context and an
	 *   optional abort signal.
	 * @returns A promise that resolves with the secured socket.
	 */
	static connect(
		stream: Duplex,
		options?: TlsSocketConnectOptions,
	): Promise<TlsSocket>;
	static async connect(
		target: number | string | Duplex,
		options?: TlsSocketConnectOptions,
	): Promise<TlsSocket> {
		let connectTarget: tls.ConnectionOptions;
		if (typeof target === "number") {
			connectTarget = { port: target };
		} else if (typeof target === "string") {
			connectTarget = { path: target };
		} else {
			connectTarget = { socket: target };
		}

		const { signal, ...connectOptions } = { ...options, ...connectTarget };

		signal?.throwIfAborted();

		const socket = new TlsSocket(tls.connect(connectOptions));

		try {
			await socket.awaitReady("secureConnect", { signal });
		} catch (error) {
			// Leaving the transport open after a failed upgrade would expose the
			// session to a cleartext downgrade.
			socket.destroy();
			throw error;
		}

		return socket;
	}

	/** Always `true`; distinguishes a TLS socket from a plaintext one. */
	get encrypted(): boolean {
		return this.socket.encrypted;
	}

	/** Whether the peer certificate was signed by one of the configured CAs. */
	get authorized(): boolean {
		return this.socket.authorized;
	}

	/**
	 * Reason why the peer certificate was rejected, or `null` when the peer is
	 * authorized or the handshake has not completed yet.
	 */
	get authorizationError(): Error | null {
		return this.socket.authorizationError ?? null;
	}

	/**
	 * Protocol selected through ALPN, or `null` before the handshake completed
	 * and when no protocol was negotiated.
	 */
	get alpnProtocol(): string | null {
		const value = this.socket.alpnProtocol;
		return value === false ? null : value;
	}

	/**
	 * Server name requested through SNI, or `null` when the peer sent none.
	 *
	 * Only set on sockets accepted by a server.
	 */
	get servername(): string | null {
		const value = this.socket.servername;
		return value === false ? null : value;
	}

	/**
	 * Returns the local certificate, or `null` when none was presented.
	 *
	 * @returns The local certificate or `null`.
	 */
	getCertificate(): tls.PeerCertificate | null {
		// Node.js widens the result to `object` for the empty "no certificate" case.
		return nullIfEmpty(
			this.socket.getCertificate() as tls.PeerCertificate | null,
		);
	}

	/**
	 * Returns the peer certificate, or `null` when the peer presented none.
	 *
	 * @param detailed Whether to include the full issuer chain.
	 * @returns The peer certificate or `null`.
	 */
	getPeerCertificate(detailed: true): tls.DetailedPeerCertificate | null;
	getPeerCertificate(detailed?: false): tls.PeerCertificate | null;
	getPeerCertificate(
		detailed?: boolean,
	): tls.PeerCertificate | tls.DetailedPeerCertificate | null {
		return nullIfEmpty(this.socket.getPeerCertificate(detailed));
	}

	/**
	 * Returns the peer certificate as an `X509Certificate`, or `null` when the
	 * peer presented none.
	 *
	 * @returns The peer certificate or `null`.
	 */
	getPeerX509Certificate(): X509Certificate | null {
		return this.socket.getPeerX509Certificate() ?? null;
	}

	/**
	 * Returns the local certificate as an `X509Certificate`, or `null` when none
	 * was presented.
	 *
	 * @returns The local certificate or `null`.
	 */
	getX509Certificate(): X509Certificate | null {
		return this.socket.getX509Certificate() ?? null;
	}

	/**
	 * Returns the negotiated cipher suite.
	 *
	 * @returns The cipher name, standard name and protocol version.
	 */
	getCipher(): tls.CipherNameAndProtocol {
		return this.socket.getCipher();
	}

	/**
	 * Returns the type, name and size of the ephemeral key exchange, or `null`
	 * when the key exchange was not ephemeral.
	 *
	 * @returns The ephemeral key information or `null`.
	 */
	getEphemeralKeyInfo(): tls.EphemeralKeyInfo | null {
		return nullIfEmpty(
			this.socket.getEphemeralKeyInfo() as tls.EphemeralKeyInfo | null,
		);
	}

	/**
	 * Returns the latest `Finished` message sent to the peer, or `null` when no
	 * handshake completed.
	 *
	 * @returns The message or `null`.
	 */
	getFinished(): Buffer | null {
		return this.socket.getFinished() ?? null;
	}

	/**
	 * Returns the latest `Finished` message received from the peer, or `null`
	 * when no handshake completed.
	 *
	 * @returns The message or `null`.
	 */
	getPeerFinished(): Buffer | null {
		return this.socket.getPeerFinished() ?? null;
	}

	/**
	 * Returns the negotiated protocol version, or `null` before the handshake
	 * completed.
	 *
	 * @returns The protocol version such as `TLSv1.3`, or `null`.
	 */
	getProtocol(): string | null {
		return this.socket.getProtocol();
	}

	/**
	 * Returns the negotiated session, which can be passed back as the `session`
	 * connect option to resume it.
	 *
	 * @returns The session or `null`.
	 */
	getSession(): Buffer | null {
		return this.socket.getSession() ?? null;
	}

	/**
	 * Returns the session ticket, or `null` when the peer issued none.
	 *
	 * @returns The session ticket or `null`.
	 */
	getTLSTicket(): Buffer | null {
		return this.socket.getTLSTicket() ?? null;
	}

	/**
	 * Returns the signature algorithms shared between client and server, in
	 * descending order of preference.
	 *
	 * @returns The shared signature algorithms.
	 */
	getSharedSigalgs(): string[] {
		return this.socket.getSharedSigalgs();
	}

	/**
	 * Indicates whether the session was resumed rather than renegotiated.
	 *
	 * @returns `true` when the session was reused.
	 */
	isSessionReused(): boolean {
		return this.socket.isSessionReused();
	}

	/**
	 * Keying material for the connection, as defined by RFC 5705.
	 *
	 * @param length Number of bytes to derive.
	 * @param label Application-specific label.
	 * @param context Optional application-specific context.
	 * @returns The derived keying material.
	 */
	exportKeyingMaterial(
		length: number,
		label: string,
		context?: Buffer,
	): Buffer {
		// Node.js accepts an omitted context; @types/node declares it required.
		return this.socket.exportKeyingMaterial(length, label, context as Buffer);
	}

	/**
	 * Renegotiates the TLS session and resolves once the new handshake completed.
	 *
	 * @param options Renegotiation options.
	 * @returns A promise that resolves once renegotiation completed.
	 * @throws {ConnectionClosedError} When the socket is already destroyed, since
	 *   Node.js would never invoke the completion callback.
	 */
	renegotiate(options?: TlsSocketRenegotiateOptions): Promise<void> {
		if (this.socket.destroyed) {
			throw new ConnectionClosedError(
				"Cannot renegotiate on a destroyed socket",
			);
		}

		return new Promise((resolve, reject) => {
			this.socket.renegotiate(options ?? {}, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	/**
	 * Sets the private key and certificate to use for this socket, overriding the
	 * ones inherited from the secure context.
	 *
	 * @param context The secure context or the options to build one from.
	 */
	setKeyCert(context: TlsSecureContext): void {
		this.socket.setKeyCert(context);
	}

	/**
	 * Sets the maximum TLS fragment size.
	 *
	 * @param size The maximum fragment size, between 512 and 16384.
	 * @returns `true` when the limit was set.
	 */
	setMaxSendFragment(size: number): boolean {
		return this.socket.setMaxSendFragment(size);
	}

	/**
	 * Disables renegotiation. Any further renegotiation attempt by the peer emits
	 * an error instead.
	 */
	disableRenegotiation(): void {
		this.socket.disableRenegotiation();
	}

	/** Enables OpenSSL trace output on standard error, for debugging. */
	enableTrace(): void {
		this.socket.enableTrace();
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.socket.on("secureConnect", () => {
			this.dispatch("secureConnect", []);
		});

		this.socket.on("secure", () => {
			this.dispatch("secure", []);
		});

		this.socket.on("OCSPResponse", (response) => {
			this.dispatch("ocspResponse", [response ?? null]);
		});

		this.socket.on("keylog", (line) => {
			this.dispatch("keylog", [line]);
		});

		this.socket.on("session", (session) => {
			this.dispatch("session", [session]);
		});
	}
}
