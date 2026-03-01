import * as net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InetAddress, InetEndpoint } from "./inet.js";
import { TcpSocket } from "./tcp-socket.js";

describe("TcpSocket", () => {
	let server: net.Server;
	let serverPort: number;
	let serverHost: string;
	let receivedData: Buffer[];

	beforeEach(
		() =>
			new Promise<void>((resolve) => {
				receivedData = [];
				serverHost = "127.0.0.1";

				server = net.createServer((socket) => {
					socket.on("data", (data) => {
						receivedData.push(data);
						// Echo back the data
						socket.write(data);
					});

					socket.on("end", () => {
						socket.end();
					});
				});

				server.listen(0, serverHost, () => {
					const address = server.address() as net.AddressInfo;
					serverPort = address.port;
					resolve();
				});
			}),
	);

	afterEach(
		() =>
			new Promise<void>((resolve) => {
				server.close(() => {
					resolve();
				});
			}),
	);

	describe("properties", () => {
		describe("connected socket", () => {
			let socket: TcpSocket;

			beforeEach(async () => {
				socket = TcpSocket.from();
				await socket.connect(serverPort, serverHost);
			});

			afterEach(async () => {
				if (!socket.closed) {
					await socket.end({ waitForClose: true });
				}
			});
			it("should report closed status during lifecycle", async () => {
				expect(socket.closed).toBe(false);
				await socket.connect(serverPort, serverHost);
				expect(socket.closed).toBe(false);
				await socket.end({ waitForClose: true });
				expect(socket.closed).toBe(true);
			});

			it("should report connecting status during connection", async () => {
				expect(socket.connecting).toBe(false);
				const connectPromise = socket.connect(serverPort, serverHost);
				expect(socket.connecting).toBe(true);
				await connectPromise;
				expect(socket.connecting).toBe(false);
			});

			it("should track bytesRead and bytesWritten during communication", async () => {
				await socket.connect(serverPort, serverHost);

				expect(socket.bytesRead).toBe(0);
				expect(socket.bytesWritten).toBe(0);

				await socket.write(Buffer.from("test data"));
				expect(socket.bytesWritten).toBeGreaterThan(0);

				// Wait for echo response
				await new Promise((resolve) => {
					socket.stream.once("data", resolve);
				});
				expect(socket.bytesRead).toBeGreaterThan(0);
			});

			it("should provide remoteEndpoint", async () => {
				const endpoint = socket.remoteEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBe(serverHost);
				expect(endpoint?.port).toBe(serverPort);
				expect(endpoint?.family).toBeOneOf([4, 6]);
			});

			it("should provide localEndpoint", async () => {
				const endpoint = socket.localEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBeDefined();
				expect(endpoint?.port).toBeGreaterThan(0);
				expect(endpoint?.family).toBeOneOf([4, 6]);
			});

			it("should get and set timeout on connected socket", async () => {
				expect(socket.timeout).toBeNull();
				socket.timeout = 5000;
				expect(socket.timeout).toBe(5000);
				socket.timeout = 0;
				expect(socket.timeout).toBe(0);
			});
		});

		describe("property getters and setters", () => {
			it("should provide null remoteEndpoint when not connected", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpSocket(mockSocket);

				// Mock properties to return undefined
				Object.defineProperty(mockSocket, "remoteAddress", {
					get: vi.fn(),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "remotePort", {
					get: vi.fn(),
					configurable: true,
				});

				expect(mockedClient.remoteEndpoint).toBeNull();
			});

			it("should provide remoteEndpoint", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpSocket(mockSocket);

				// Mock remote endpoint properties
				Object.defineProperty(mockSocket, "remoteAddress", {
					get: vi.fn(() => "192.168.1.100"),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "remotePort", {
					get: vi.fn(() => 8080),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "remoteFamily", {
					get: vi.fn(() => "IPv4"),
					configurable: true,
				});

				const endpoint = mockedClient.remoteEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBe("192.168.1.100");
				expect(endpoint?.port).toBe(8080);
				expect(endpoint?.family).toBe(4);
			});

			it("should provide localEndpoint", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpSocket(mockSocket);

				// Mock local endpoint properties
				Object.defineProperty(mockSocket, "localAddress", {
					get: vi.fn(() => "127.0.0.1"),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "localPort", {
					get: vi.fn(() => 12345),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "localFamily", {
					get: vi.fn(() => "IPv4"),
					configurable: true,
				});

				const endpoint = mockedClient.localEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBe("127.0.0.1");
				expect(endpoint?.port).toBe(12345);
				expect(endpoint?.family).toBe(4);
			});
		});
	});

	describe("methods", () => {
		it("should set keep-alive", () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);

			const setKeepAliveSpy = vi.spyOn(mockSocket, "setKeepAlive");

			socket.setKeepAlive(true, 1000);
			expect(setKeepAliveSpy).toHaveBeenNthCalledWith(1, true, 1000);

			socket.setKeepAlive(false);
			expect(setKeepAliveSpy).toHaveBeenNthCalledWith(2, false, undefined);
		});

		it("should set no-delay", () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);

			const setNoDelaySpy = vi.spyOn(mockSocket, "setNoDelay");

			socket.setNoDelay(true);
			expect(setNoDelaySpy).toHaveBeenCalledWith(true);

			socket.setNoDelay(false);
			expect(setNoDelaySpy).toHaveBeenCalledWith(false);
		});

		describe("connect", () => {
			it("should connect to a TCP server", async () => {
				const socket = TcpSocket.from();
				await socket.connect(serverPort, serverHost);
				expect(socket.connecting).toBe(false);
				expect(socket.closed).toBe(false);
				await socket.end();
			});

			it("should connect with only port parameter", async () => {
				const socket = TcpSocket.from();
				await socket.connect(serverPort);
				expect(socket.connecting).toBe(false);
				expect(socket.closed).toBe(false);
				await socket.end();
			});

			it("should reject on connection error", async () => {
				const socket = TcpSocket.from();
				// Try to connect to an invalid port
				await expect(socket.connect(1, "0.0.0.0")).rejects.toThrow();
			});

			it("should reject on connection to non-existent host", async () => {
				const socket = TcpSocket.from();
				await expect(
					socket.connect(serverPort, "invalid.host.example.com"),
				).rejects.toThrow();
			});

			it("should pass additional connection options", async () => {
				const socket = TcpSocket.from();
				await socket.connect(serverPort, serverHost, {
					localPort: undefined, // Let system assign
				});
				expect(socket.connecting).toBe(false);
				expect(socket.closed).toBe(false);
				await socket.end();
			});

			it("should handle connection refused error", async () => {
				// Use a port that is very unlikely to be in use
				const unusedPort = 54321;
				const socket = TcpSocket.from();

				await expect(socket.connect(unusedPort, serverHost)).rejects.toThrow();
			});
		});
	});

	describe("events forwarding", () => {
		it("should forward connect event", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const connectPromise = new Promise<void>((resolve) => {
				socket.subscribe(
					"connect",
					() => {
						resolve();
					},
					{ once: true },
				);
			});
			mockSocket.emit("connect");
			await connectPromise;
		});

		it("should forward connectionAttempt event", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const testEndpoint: InetEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4,
			};
			const eventPromise = new Promise<{ endpoint: typeof testEndpoint }>(
				(resolve) => {
					socket.subscribe(
						"connectionAttempt",
						(endpoint) => {
							resolve({ endpoint });
						},
						{ once: true },
					);
				},
			);
			mockSocket.emit(
				"connectionAttempt",
				testEndpoint.address,
				testEndpoint.port,
				testEndpoint.family,
			);
			const { endpoint } = await eventPromise;
			expect(endpoint).toEqual(testEndpoint);
		});

		it("should forward connectionAttemptFailed event", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const testError = new Error("Connection failed");
			const testEndpoint: InetEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4 as const,
			};
			const eventPromise = new Promise<{
				endpoint: typeof testEndpoint;
				error: Error;
			}>((resolve) => {
				socket.subscribe(
					"connectionAttemptFailed",
					(endpoint, error) => {
						resolve({ endpoint, error });
					},
					{ once: true },
				);
			});
			mockSocket.emit(
				"connectionAttemptFailed",
				testEndpoint.address,
				testEndpoint.port,
				testEndpoint.family,
				testError,
			);
			const result = await eventPromise;
			expect(result.endpoint).toEqual(testEndpoint);
			expect(result.error).toBe(testError);
		});

		it("should forward connectionAttemptTimeout event", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const testEndpoint: InetEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4 as const,
			};
			const eventPromise = new Promise<{ endpoint: typeof testEndpoint }>(
				(resolve) => {
					socket.subscribe(
						"connectionAttemptTimeout",
						(endpoint) => {
							resolve({ endpoint });
						},
						{ once: true },
					);
				},
			);
			mockSocket.emit(
				"connectionAttemptTimeout",
				testEndpoint.address,
				testEndpoint.port,
				testEndpoint.family,
			);
			const { endpoint } = await eventPromise;
			expect(endpoint).toEqual(testEndpoint);
		});

		it("should forward lookup event with IPv4", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const eventPromise = new Promise<{
				err: Error | null;
				address: InetAddress;
				host: string;
			}>((resolve) => {
				socket.subscribe(
					"lookup",
					(err, address, host) => {
						resolve({ err, address, host });
					},
					{ once: true },
				);
			});
			mockSocket.emit("lookup", null, "127.0.0.1", 4, "localhost");
			const result = await eventPromise;
			expect(result.err).toBeNull();
			expect(result.address).toEqual({
				address: "127.0.0.1",
				family: 4,
			});
			expect(result.host).toBe("localhost");
		});

		it("should forward lookup event with IPv6", async () => {
			const mockSocket = new net.Socket();
			const socket = new TcpSocket(mockSocket);
			const eventPromise = new Promise<{
				err: Error | null;
				address: InetAddress;
				host: string;
			}>((resolve) => {
				socket.subscribe(
					"lookup",
					(err, address, host) => {
						resolve({ err, address, host });
					},
					{ once: true },
				);
			});
			mockSocket.emit("lookup", null, "::1", 6, "localhost");
			const result = await eventPromise;
			expect(result.err).toBeNull();
			expect(result.address).toEqual({
				address: "::1",
				family: 6,
			});
			expect(result.host).toBe("localhost");
		});
	});

	describe("integration scenarios", () => {
		it("should handle full request-response cycle", async () => {
			const socket = TcpSocket.from();
			await socket.connect(serverPort, serverHost);

			// Write data
			const testData = "Test message";
			await socket.write(Buffer.from(testData));

			// Read response
			const response = await new Promise<string>((resolve) => {
				socket.stream.once("data", (data: Buffer) => {
					resolve(data.toString());
				});
			});

			expect(response).toBe(testData);

			await socket.end({ waitForClose: true });
		});

		it("should handle connection with data listener", async () => {
			const socket = TcpSocket.from();
			const dataChunks: Buffer[] = [];

			socket.stream.on("data", (chunk: Buffer) => {
				dataChunks.push(chunk);
			});

			await socket.connect(serverPort, serverHost);
			await socket.write(Buffer.from("Test data"));

			// Wait for echo
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(dataChunks.length).toBeGreaterThan(0);
			expect(Buffer.concat(dataChunks).toString()).toBe("Test data");

			await socket.end({ waitForClose: true });
		});

		describe("events", () => {
			it("should emit connect event", async () => {
				const socket = TcpSocket.from();
				const connectPromise = new Promise<void>((resolve) => {
					socket.subscribe("connect", resolve, { once: true });
				});
				await socket.connect(serverPort, serverHost);
				await connectPromise;
				await socket.end();
			});

			it("should emit lookup event when connecting to hostname", async () => {
				const socket = TcpSocket.from();
				const lookupPromise = new Promise<void>((resolve) => {
					socket.subscribe(
						"lookup",
						(_err, _address, _host) => {
							resolve();
						},
						{ once: true },
					);
				});
				// Connect to 'localhost' to trigger DNS lookup
				await socket.connect(serverPort, "localhost");
				await lookupPromise;
				await socket.end();
			});
		});
	});
});
