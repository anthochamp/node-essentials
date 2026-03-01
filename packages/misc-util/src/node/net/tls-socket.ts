import type { X509Certificate } from "node:crypto";
import type { Duplex } from "node:stream";
import * as tls from "node:tls";
import type { Except } from "type-fest";
import { isObject } from "../../ecma/is-object.js";
import type { StreamSocketEvents } from "./stream-socket.js";
import { StreamSocket } from "./stream-socket.js";

export type TlsSocketEvents = StreamSocketEvents & {
	secureConnect: [];
	ocspResponse: [response: Buffer | null];
	keylog: [line: Buffer];
	session: [session: Buffer];
};

export type TlsSocketOptions = Except<
	tls.TLSSocketOptions,
	"isServer" | "server" | keyof tls.SecureContextOptions
>;

export class TlsSocket extends StreamSocket<tls.TLSSocket, TlsSocketEvents> {
	static override from(stream: Duplex, options?: TlsSocketOptions): TlsSocket {
		return new TlsSocket(new tls.TLSSocket(stream, options));
	}

	get encrypted(): boolean {
		return this.sock.encrypted;
	}

	get authorized(): boolean {
		return this.sock.authorized;
	}

	get authorizationError(): Error | null {
		return this.sock.authorizationError ?? null;
	}

	get alpnProtocol(): string | null {
		const value = this.sock.alpnProtocol;
		return value === false ? null : value;
	}

	getCertificate(): tls.PeerCertificate | null {
		const cert = this.sock.getCertificate();

		// Connection established but no certificate presented
		if (isObject(cert) && Object.keys(cert).length === 0) {
			return null;
		}

		if (cert === null) {
			return null;
		}

		return cert as tls.PeerCertificate;
	}

	getCipher(): tls.CipherNameAndProtocol {
		return this.sock.getCipher();
	}

	getEphemeralKeyInfo(): tls.EphemeralKeyInfo | object | null {
		return this.sock.getEphemeralKeyInfo();
	}

	getFinished(): Buffer | null {
		const value = this.sock.getFinished();
		return value ?? null;
	}

	getPeerCertificate<
		T extends boolean | undefined,
		R = T extends true ? tls.DetailedPeerCertificate : tls.PeerCertificate,
	>(detailed?: T): R {
		return this.sock.getPeerCertificate(detailed) as R;
	}

	getPeerFinished(): Buffer | null {
		const value = this.sock.getPeerFinished();
		return value ?? null;
	}

	getProtocol(): string | null {
		return this.sock.getProtocol();
	}

	getSession(): Buffer | null {
		const value = this.sock.getSession();
		return value ?? null;
	}

	getSharedSigalgs(): string[] {
		return this.sock.getSharedSigalgs();
	}

	getTicket(): Buffer | null {
		const value = this.sock.getTLSTicket();
		return value ?? null;
	}

	isSessionReused(): boolean {
		return this.sock.isSessionReused();
	}

	async renegotiate(
		options: Parameters<tls.TLSSocket["renegotiate"]>[0],
	): Promise<void> {
		// renegotiate callback is never called if socket is destroyed
		if (this.sock.destroyed) {
			throw new Error("Socket is destroyed");
		}

		return new Promise((resolve, reject) => {
			const callback = (err: Error | null | undefined) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			};

			this.sock.renegotiate(options, callback);
		});
	}

	setKeyCert(context: tls.SecureContext): void {
		this.sock.setKeyCert(context);
	}

	setMaxSendFragment(size: number): boolean {
		return this.sock.setMaxSendFragment(size);
	}

	disableRenegotiation(): void {
		this.sock.disableRenegotiation();
	}

	enableTrace(): void {
		this.sock.enableTrace();
	}

	getPeerX509Certificate(): X509Certificate | null {
		const cert = this.sock.getPeerX509Certificate();
		return cert ?? null;
	}

	getX509Certificate(): X509Certificate | null {
		const cert = this.sock.getX509Certificate();
		return cert ?? null;
	}

	exportKeyingMaterial(length: number, label: string, context: Buffer): Buffer {
		return this.sock.exportKeyingMaterial(length, label, context);
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.sock.on("secureConnect", () => {
			this.dispatch("secureConnect");
		});

		this.sock.on("OCSPResponse", (response) => {
			this.dispatch("ocspResponse", response);
		});

		this.sock.on("keylog", (line) => {
			this.dispatch("keylog", line);
		});

		this.sock.on("session", (session) => {
			this.dispatch("session", session);
		});
	}
}
