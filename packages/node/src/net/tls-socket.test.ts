import { PassThrough } from "node:stream";
import * as tls from "node:tls";

import { describe, expect, it, vi } from "vitest";

import { ConnectionClosedError } from "./connection-closed-error.js";
import { TlsSocket } from "./tls-socket.js";

vi.mock(import("node:tls"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		connect: vi.fn(),
	};
});

const connectMock = vi.mocked(
	tls.connect as unknown as (options: tls.ConnectionOptions) => tls.TLSSocket,
);

function createTlsStream(members: object = {}): tls.TLSSocket {
	return Object.assign(new PassThrough(), members) as unknown as tls.TLSSocket;
}

describe("TlsSocket", () => {
	describe("connect", () => {
		it("connects to a port and resolves on secureConnect", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce((options) => {
				queueMicrotask(() => tlsStream.emit("secureConnect"));
				expect(options).toMatchObject({ port: 443, host: "example.com" });
				return tlsStream;
			});

			const socket = await TlsSocket.connect(443, { host: "example.com" });

			expect(socket.stream).toBe(tlsStream);
		});

		it("connects to a local endpoint path", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce((options) => {
				queueMicrotask(() => {
					tlsStream.emit("secureConnect");
				});
				expect(options).toMatchObject({ path: "/var/run/app.sock" });
				expect(options).not.toHaveProperty("port");
				return tlsStream;
			});

			const socket = await TlsSocket.connect("/var/run/app.sock");

			expect(socket.stream).toBe(tlsStream);
		});

		it("upgrades an existing stream", async () => {
			const stream = new PassThrough();
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce((options) => {
				queueMicrotask(() => tlsStream.emit("secureConnect"));
				expect(options).toMatchObject({
					socket: stream,
					rejectUnauthorized: false,
				});
				return tlsStream;
			});

			const socket = await TlsSocket.connect(stream, {
				rejectUnauthorized: false,
			});

			expect(socket.stream).toBe(tlsStream);
			expect(connectMock).toHaveBeenCalledTimes(1);
		});

		it("does not forward the abort signal as a connect option", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce((options) => {
				queueMicrotask(() => tlsStream.emit("secureConnect"));
				expect(options).not.toHaveProperty("signal");
				return tlsStream;
			});

			await TlsSocket.connect(443, { signal: new AbortController().signal });
		});

		it("rejects and destroys the transport when the handshake fails", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce(() => {
				queueMicrotask(() => {
					tlsStream.emit("error", new Error("handshake failed"));
				});
				return tlsStream;
			});

			await expect(TlsSocket.connect(443)).rejects.toThrow("handshake failed");
			expect(tlsStream.destroyed).toBe(true);
		});

		it("rejects when the transport closes before the handshake", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce(() => {
				queueMicrotask(() => {
					tlsStream.emit("close");
				});
				return tlsStream;
			});

			await expect(TlsSocket.connect(443)).rejects.toThrow(
				ConnectionClosedError,
			);
		});

		it("rejects immediately when the signal is already aborted", async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(
				TlsSocket.connect(443, { signal: controller.signal }),
			).rejects.toThrow();
			expect(connectMock).not.toHaveBeenCalled();
		});

		it("rejects and destroys the transport when aborted mid-handshake", async () => {
			const tlsStream = createTlsStream();
			connectMock.mockImplementationOnce(() => tlsStream);
			const controller = new AbortController();

			const connectPromise = TlsSocket.connect(443, {
				signal: controller.signal,
			});
			controller.abort();

			await expect(connectPromise).rejects.toThrow();
			expect(tlsStream.destroyed).toBe(true);
		});
	});

	describe("properties", () => {
		it("reports alpnProtocol as null when no protocol was negotiated", () => {
			expect(
				new TlsSocket(createTlsStream({ alpnProtocol: false })).alpnProtocol,
			).toBeNull();
			expect(
				new TlsSocket(createTlsStream({ alpnProtocol: "h2" })).alpnProtocol,
			).toBe("h2");
		});

		it("reports servername as null when the peer sent none", () => {
			expect(
				new TlsSocket(createTlsStream({ servername: false })).servername,
			).toBeNull();
			expect(
				new TlsSocket(createTlsStream({ servername: "example.com" }))
					.servername,
			).toBe("example.com");
		});

		it("reports authorizationError as null while unset", () => {
			expect(
				new TlsSocket(createTlsStream({ authorizationError: undefined }))
					.authorizationError,
			).toBeNull();
		});
	});

	describe("certificates", () => {
		it("normalizes an empty local certificate to null", () => {
			const socket = new TlsSocket(
				createTlsStream({ getCertificate: () => ({}) }),
			);
			expect(socket.getCertificate()).toBeNull();
		});

		it("normalizes an empty peer certificate to null", () => {
			const socket = new TlsSocket(
				createTlsStream({ getPeerCertificate: () => ({}) }),
			);
			expect(socket.getPeerCertificate()).toBeNull();
		});

		it("returns the peer certificate when one was presented", () => {
			const certificate = { subject: { CN: "example.com" } };
			const socket = new TlsSocket(
				createTlsStream({ getPeerCertificate: () => certificate }),
			);
			expect(socket.getPeerCertificate()).toBe(certificate);
		});

		it("normalizes a non-ephemeral key exchange to null", () => {
			const socket = new TlsSocket(
				createTlsStream({ getEphemeralKeyInfo: () => ({}) }),
			);
			expect(socket.getEphemeralKeyInfo()).toBeNull();
		});

		it("normalizes missing X509 certificates to null", () => {
			const socket = new TlsSocket(
				createTlsStream({
					getPeerX509Certificate: () => undefined,
					getX509Certificate: () => undefined,
				}),
			);
			expect(socket.getPeerX509Certificate()).toBeNull();
			expect(socket.getX509Certificate()).toBeNull();
		});

		it("normalizes missing session material to null", () => {
			const socket = new TlsSocket(
				createTlsStream({
					getFinished: () => undefined,
					getPeerFinished: () => undefined,
					getSession: () => undefined,
					getTLSTicket: () => undefined,
				}),
			);
			expect(socket.getFinished()).toBeNull();
			expect(socket.getPeerFinished()).toBeNull();
			expect(socket.getSession()).toBeNull();
			expect(socket.getTLSTicket()).toBeNull();
		});
	});

	describe("exportKeyingMaterial", () => {
		it("omits the context when the caller provides none", () => {
			const exportKeyingMaterial = vi.fn(() => Buffer.alloc(8));
			const socket = new TlsSocket(createTlsStream({ exportKeyingMaterial }));

			socket.exportKeyingMaterial(8, "label");

			expect(exportKeyingMaterial).toHaveBeenCalledWith(8, "label", undefined);
		});
	});

	describe("renegotiate", () => {
		it("resolves when renegotiation completes", async () => {
			const renegotiate = (
				_options: object,
				callback: (error: Error | null) => void,
			) => {
				callback(null);
				return true;
			};
			const socket = new TlsSocket(createTlsStream({ renegotiate }));

			await expect(socket.renegotiate({})).resolves.toBeUndefined();
		});

		it("rejects when renegotiation fails", async () => {
			const renegotiate = (
				_options: object,
				callback: (error: Error | null) => void,
			) => {
				callback(new Error("denied"));
				return false;
			};
			const socket = new TlsSocket(createTlsStream({ renegotiate }));

			await expect(socket.renegotiate({})).rejects.toThrow("denied");
		});

		it("throws on a destroyed socket instead of never settling", () => {
			const socket = new TlsSocket(createTlsStream());
			socket.destroy();

			expect(() => socket.renegotiate({})).toThrow(ConnectionClosedError);
		});
	});

	describe("events forwarding", () => {
		it("forwards secureConnect", async () => {
			const tlsStream = createTlsStream();
			const socket = new TlsSocket(tlsStream);
			const received = socket.wait("secureConnect");

			tlsStream.emit("secureConnect");

			await expect(received).resolves.toEqual([]);
		});

		it("forwards OCSPResponse as ocspResponse", async () => {
			const tlsStream = createTlsStream();
			const socket = new TlsSocket(tlsStream);
			const received = socket.wait("ocspResponse");
			const response = Buffer.from([1, 2, 3]);

			tlsStream.emit("OCSPResponse", response);

			await expect(received).resolves.toEqual([response]);
		});

		it("forwards keylog and session", async () => {
			const tlsStream = createTlsStream();
			const socket = new TlsSocket(tlsStream);
			const keylog = socket.wait("keylog");
			const session = socket.wait("session");

			tlsStream.emit("keylog", Buffer.from("line"));
			tlsStream.emit("session", Buffer.from("session"));

			await expect(keylog).resolves.toEqual([Buffer.from("line")]);
			await expect(session).resolves.toEqual([Buffer.from("session")]);
		});

		it("forwards each event exactly once", () => {
			const tlsStream = createTlsStream();
			const socket = new TlsSocket(tlsStream);
			const listener = vi.fn();
			socket.subscribe("secure", listener);

			tlsStream.emit("secure");

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});
});
