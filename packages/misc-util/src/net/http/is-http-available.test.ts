import { afterEach, describe, expect, it } from "vitest";
import { HttpServer } from "../../node/net/http/server/http-server.js";
import { HttpHeaders } from "./http-headers.js";
import { isHttpAvailable } from "./is-http-available.js";

describe("isHttpAvailable", () => {
	let server: HttpServer | null = null;

	afterEach(async () => {
		if (server?.listening) {
			await server.close();
			server = null;
		}
	});

	describe("available endpoints", () => {
		it("should return true for an available HTTP endpoint", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			server.on("request", async (stream) => {
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});

		it("should return true for an available endpoint (HEAD request)", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			let requestMethod = "";
			server.on("request", async (stream) => {
				requestMethod = stream.request.method;
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
			expect(requestMethod).toBe("HEAD");
		});

		it("should return true even for error responses", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			server.on("request", async (stream) => {
				stream.request.writeHead(404, new HttpHeaders());
				await stream.request.end();
			});

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
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			server.on("request", async (stream) => {
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const url = new URL(`http://127.0.0.1:${address.port}/`);
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});

		it("should accept string URL", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			server.on("request", async (stream) => {
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const url = `http://127.0.0.1:${address.port}/test`;
			const result = await isHttpAvailable(url);

			expect(result).toBe(true);
		});
	});

	describe("abort signal", () => {
		it("should respect abort signal", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			// Don't respond immediately to simulate slow server
			server.on("request", async (stream) => {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const controller = new AbortController();
			const url = `http://127.0.0.1:${address.port}/`;

			// Abort after 100ms
			setTimeout(() => controller.abort(), 100);

			const result = await isHttpAvailable(url, controller.signal);

			expect(result).toBe(false);
		});

		it("should work with null signal", async () => {
			server = HttpServer.from({ protocol: "http/1.1" });
			await server.listen(0, "127.0.0.1");
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("Invalid address");
			}

			server.on("request", async (stream) => {
				stream.request.writeHead(200, new HttpHeaders());
				await stream.request.end();
			});

			const url = `http://127.0.0.1:${address.port}/`;
			const result = await isHttpAvailable(url, null);

			expect(result).toBe(true);
		});
	});
});
