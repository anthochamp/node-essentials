import { randomUUID } from "node:crypto";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ConnectionClosedError } from "./connection-closed-error.js";
import { IpcServer } from "./ipc-server.js";
import { IpcSocket } from "./ipc-socket.js";

const socketConstructed =
	vi.fn<(options?: net.SocketConstructorOpts) => void>();

vi.mock(import("node:net"), async (importActual) => {
	const actual = await importActual();

	// Adopting a real descriptor would need a pipe the public API cannot create,
	// so the construction options are what this file can assert on.
	class Socket extends actual.Socket {
		constructor(options?: net.SocketConstructorOpts) {
			socketConstructed(options);
			super(options?.fd === undefined ? options : undefined);
		}
	}

	return { ...actual, Socket };
});

function createSocketPath(): string {
	return join(tmpdir(), `ac-kit-ipc-${randomUUID()}.sock`);
}

describe("IpcSocket", () => {
	let server: IpcServer | undefined;
	let socket: IpcSocket | undefined;

	afterEach(async () => {
		socket?.destroy();
		socket = undefined;

		if (server?.listening) {
			await server.close();
		}
		server = undefined;
	});

	it("connects to a listening server and exchanges data", async () => {
		const path = createSocketPath();
		server = IpcServer.from();
		const accepted = server.wait("connection");
		await server.listen(path);

		socket = IpcSocket.from();
		await socket.connect(path);

		const [peer] = await accepted;
		const received = new Promise<Buffer>((resolve) => {
			peer.stream.once("data", resolve);
		});

		await socket.write(Buffer.from("ping"));

		expect((await received).toString()).toBe("ping");
	});

	it("rejects when no server listens on the path", async () => {
		socket = IpcSocket.from();

		await expect(socket.connect(createSocketPath())).rejects.toThrow();
	});

	it("rejects immediately when the signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		socket = IpcSocket.from();

		await expect(
			socket.connect(createSocketPath(), { signal: controller.signal }),
		).rejects.toThrow();
	});

	it("rejects when the socket closes before connecting", async () => {
		socket = IpcSocket.from();
		const connectPromise = socket.connect(createSocketPath());
		// Closing without an "error" would otherwise leave the promise pending.
		socket.stream.emit("close");

		await expect(connectPromise).rejects.toThrow(ConnectionClosedError);
	});

	describe("fromFd", () => {
		it("adopts the descriptor as bidirectional by default", () => {
			socketConstructed.mockClear();

			IpcSocket.fromFd(7);

			expect(socketConstructed).toHaveBeenCalledWith({
				fd: 7,
				readable: true,
				writable: true,
			});
		});

		it("lets the caller adopt a one-way pipe", () => {
			socketConstructed.mockClear();

			IpcSocket.fromFd(7, { writable: false });

			expect(socketConstructed).toHaveBeenCalledWith({
				fd: 7,
				readable: true,
				writable: false,
			});
		});
	});
});
