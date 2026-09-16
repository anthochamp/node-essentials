import { randomUUID } from "node:crypto";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UnsupportedError } from "@ac-kit/core";
import { afterEach, describe, expect, it } from "vitest";

import { IpcServer } from "./ipc-server.js";
import { IpcSocket } from "./ipc-socket.js";

function createSocketPath(): string {
	return join(tmpdir(), `ac-kit-ipc-${randomUUID()}.sock`);
}

describe("IpcServer", () => {
	let server: IpcServer | undefined;

	afterEach(async () => {
		if (server?.listening) {
			await server.close();
		}
		server = undefined;
	});

	it("reports no address before listening", () => {
		server = IpcServer.from();

		expect(server.listening).toBe(false);
		expect(server.address()).toBeNull();
	});

	it("reports the bound path while listening", async () => {
		const path = createSocketPath();
		server = IpcServer.from();
		await server.listen(path);

		expect(server.listening).toBe(true);
		expect(server.address()).toBe(path);
	});

	it("rejects when the path is already bound", async () => {
		const path = createSocketPath();
		server = IpcServer.from();
		await server.listen(path);

		const other = IpcServer.from();
		await expect(other.listen(path)).rejects.toThrow();
	});

	it("counts accepted connections", async () => {
		const path = createSocketPath();
		server = IpcServer.from();
		const accepted = server.wait("connection");
		await server.listen(path);

		const socket = IpcSocket.from();
		await socket.connect(path);
		await accepted;

		expect(await server.getConnections()).toBe(1);

		socket.destroy();
	});

	it("throws when the wrapped server is bound to an IP endpoint", async () => {
		const bound = net.createServer();
		await new Promise<void>((resolve) => {
			bound.listen(0, "127.0.0.1", resolve);
		});
		server = new IpcServer(bound);

		expect(() => server?.address()).toThrow(UnsupportedError);
	});
});
