import type { Server } from "node:http";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { isHttpAvailable } from "./is-http-available.js";

function listenAsync(
	server: Server,
	port: number,
	host: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, host, () => {
			server.removeListener("error", reject);
			resolve();
		});
	});
}

function closeAsync(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.closeAllConnections();
		server.close((error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}

describe("isHttpAvailable", () => {
	let server: Server | null = null;

	afterEach(async () => {
		if (server?.listening) {
			await closeAsync(server);
			server = null;
		}
	});

	describe("available endpoints", () => {
		it("should return true for an available HTTP endpoint", async () => {
			server = createServer((_, res) => {
				res.writeHead(200);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});

		it("should return true for an available endpoint (HEAD request)", async () => {
			let requestMethod = "";
			server = createServer((req, res) => {
				requestMethod = req.method ?? "";
				res.writeHead(200);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
			expect(requestMethod).toBe("HEAD");
		});

		it("should return true even for error responses", async () => {
			server = createServer((_, res) => {
				res.writeHead(404);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = `http://127.0.0.1:${address.port}/not-found`;
			const result = await isHttpAvailable(url);

			// The function returns true if the server responds, regardless of status code
			expect(result).toBe(true);
		});
	});

	describe("unavailable endpoints", () => {
		it("should return false for an unavailable endpoint", async () => {
			// Use a port that's unlikely to be in use
			const url = "http://127.0.0.1:59999/";
			const result = await isHttpAvailable(url);

			expect(result).toBe(false);
		});

		it("should return false for invalid URL", async () => {
			const result = await isHttpAvailable("http://invalid.local.test:99999/");

			expect(result).toBe(false);
		});

		it("should return false for network errors", async () => {
			const result = await isHttpAvailable("http://0.0.0.0:1/");

			expect(result).toBe(false);
		});
	});

	describe("URL parameter", () => {
		it("should accept URL object", async () => {
			server = createServer((_, res) => {
				res.writeHead(200);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = new URL(`http://127.0.0.1:${address.port}/`);
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});

		it("should accept string URL", async () => {
			server = createServer((_, res) => {
				res.writeHead(200);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = `http://127.0.0.1:${address.port}/test`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});
	});

	describe("abort signal", () => {
		it("should respect abort signal", async () => {
			// Don't respond immediately to simulate a slow server
			server = createServer((_, res) => {
				setTimeout(() => {
					res.writeHead(200);
					res.end();
				}, 5000);
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const controller = new AbortController();
			const url = `http://127.0.0.1:${address.port}/`;

			// Abort after 100ms
			setTimeout(() => controller.abort(), 100);

			const result = await isHttpAvailable(url, controller.signal);

			expect(result).toBe(false);
		});

		it("should work with null signal", async () => {
			server = createServer((_, res) => {
				res.writeHead(200);
				res.end();
			});
			await listenAsync(server, 0, "127.0.0.1");
			const address = server.address() as AddressInfo;

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url, null);

			expect(result).toBe(true);
		});
	});
});
