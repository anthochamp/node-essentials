import { PassThrough } from "node:stream";
import * as tls from "node:tls";

import { afterEach, describe, expect, it, vi } from "vitest";

import { TlsServer } from "./tls-server.js";
import { TlsSocket } from "./tls-socket.js";

function createTlsStream(): tls.TLSSocket {
	return new PassThrough() as unknown as tls.TLSSocket;
}

describe("TlsServer", () => {
	let server: TlsServer | undefined;

	afterEach(async () => {
		if (server?.listening) {
			await server.close();
		}
		server = undefined;
	});

	it("binds and reports its endpoint", async () => {
		server = TlsServer.from();
		expect(server.address()).toBeNull();

		await server.listen(0, { host: "127.0.0.1" });

		const endpoint = server.address();
		expect(endpoint?.address).toBe("127.0.0.1");
		expect(endpoint?.port).toBeGreaterThan(0);
	});

	it("forwards secureConnection with a TlsSocket", async () => {
		const raw = tls.createServer();
		server = new TlsServer(raw);
		const received = server.wait("secureConnection");
		const tlsSocket = createTlsStream();

		raw.emit("secureConnection", tlsSocket);

		const [socket] = await received;
		expect(socket).toBeInstanceOf(TlsSocket);
		expect(socket.stream).toBe(tlsSocket);
	});

	it("reuses one wrapper per accepted socket across events", async () => {
		const raw = tls.createServer();
		server = new TlsServer(raw);
		const secure = server.wait("secureConnection");
		const keylog = server.wait("keylog");
		const tlsSocket = createTlsStream();

		raw.emit("secureConnection", tlsSocket);
		raw.emit("keylog", Buffer.from("line"), tlsSocket);

		const [[socket], [line, keylogSocket]] = await Promise.all([
			secure,
			keylog,
		]);
		expect(keylogSocket).toBe(socket);
		expect(line.toString()).toBe("line");
	});

	it("forwards tlsClientError", async () => {
		const raw = tls.createServer();
		server = new TlsServer(raw);
		const received = server.wait("tlsClientError");
		const error = new Error("bad handshake");
		const tlsSocket = createTlsStream();

		raw.emit("tlsClientError", error, tlsSocket);

		const [forwarded] = await received;
		expect(forwarded).toBe(error);
	});

	it("does not listen for the session callback events", () => {
		const raw = tls.createServer();
		server = new TlsServer(raw);

		// Node.js only applies its default behaviour while nothing listens, so a
		// forwarded listener without a subscriber would stall the handshake.
		expect(raw.listenerCount("newSession")).toBe(0);
		expect(raw.listenerCount("resumeSession")).toBe(0);
		expect(raw.listenerCount("OCSPRequest")).toBe(0);
	});

	it("exposes the secure context management of the underlying server", () => {
		const raw = tls.createServer();
		const addContext = vi.spyOn(raw, "addContext").mockImplementation(() => {});
		const setSecureContext = vi
			.spyOn(raw, "setSecureContext")
			.mockImplementation(() => {});
		server = new TlsServer(raw);

		server.addContext("example.com", {});
		server.setSecureContext({});

		expect(addContext).toHaveBeenCalledWith("example.com", {});
		expect(setSecureContext).toHaveBeenCalledWith({});
	});
});
