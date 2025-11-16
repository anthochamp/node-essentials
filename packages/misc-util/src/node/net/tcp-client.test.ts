import * as net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TcpClient } from "./tcp-client.js";

describe("TcpClient", () => {
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

	describe("from", () => {
		it("should create a new TcpClient instance", () => {
			const client = TcpClient.from();
			expect(client).toBeInstanceOf(TcpClient);
		});

		it("should create a TcpClient with custom socket options", () => {
			const mockSocket = new net.Socket({ allowHalfOpen: true });
			const client = new TcpClient(mockSocket);
			expect(client).toBeInstanceOf(TcpClient);
			// Stream is a net.Socket which has allowHalfOpen
			expect((client.stream as { allowHalfOpen?: boolean }).allowHalfOpen).toBe(
				true,
			);
		});
	});

	describe("stream", () => {
		it("should expose the underlying socket stream", () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);
			expect(client.stream).toBeDefined();
			expect(client.stream).toHaveProperty("on");
			expect(client.stream).toHaveProperty("write");
			expect(client.stream).toHaveProperty("read");
		});

		it("should return a Duplex stream", () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);
			expect(client.stream.readable).toBeDefined();
			expect(client.stream.writable).toBeDefined();
		});
	});

	describe("properties", () => {
		describe("connected client", () => {
			let client: TcpClient;

			beforeEach(async () => {
				client = TcpClient.from();
				await client.connect(serverPort, serverHost);
			});

			afterEach(async () => {
				if (!client.closed) {
					await client.end({ waitForClose: true });
				}
			});
			it("should report closed status during lifecycle", async () => {
				expect(client.closed).toBe(false);
				await client.connect(serverPort, serverHost);
				expect(client.closed).toBe(false);
				await client.end({ waitForClose: true });
				expect(client.closed).toBe(true);
			});

			it("should report connecting status during connection", async () => {
				expect(client.connecting).toBe(false);
				const connectPromise = client.connect(serverPort, serverHost);
				expect(client.connecting).toBe(true);
				await connectPromise;
				expect(client.connecting).toBe(false);
			});

			it("should track bytesRead and bytesWritten during communication", async () => {
				await client.connect(serverPort, serverHost);

				expect(client.bytesRead).toBe(0);
				expect(client.bytesWritten).toBe(0);

				await client.write("test data");
				expect(client.bytesWritten).toBeGreaterThan(0);

				// Wait for echo response
				await new Promise((resolve) => {
					client.stream.once("data", resolve);
				});
				expect(client.bytesRead).toBeGreaterThan(0);
			});

			it("should provide remoteEndpoint", async () => {
				const endpoint = client.remoteEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBe(serverHost);
				expect(endpoint?.port).toBe(serverPort);
				expect(endpoint?.family).toBeOneOf([4, 6]);
			});

			it("should provide localEndpoint", async () => {
				const endpoint = client.localEndpoint;
				expect(endpoint).not.toBeNull();
				expect(endpoint?.address).toBeDefined();
				expect(endpoint?.port).toBeGreaterThan(0);
				expect(endpoint?.family).toBeOneOf([4, 6]);
			});

			it("should get and set timeout on connected socket", async () => {
				expect(client.timeout).toBeNull();
				client.timeout = 5000;
				expect(client.timeout).toBe(5000);
				client.timeout = 0;
				expect(client.timeout).toBe(0);
			});
		});

		describe("property getters and setters", () => {
			it("should get and set timeout", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpClient(mockSocket);

				const setTimeoutSpy = vi.spyOn(mockSocket, "setTimeout");

				// Initially null (no timeout set)
				expect(mockedClient.timeout).toBeNull();

				// Set timeout
				mockedClient.timeout = 5000;
				expect(setTimeoutSpy).toHaveBeenCalledWith(5000);

				// Set to 0 (disable timeout)
				mockedClient.timeout = 0;
				expect(setTimeoutSpy).toHaveBeenCalledWith(0);
			});

			it("should report closed status", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpClient(mockSocket);

				// Mock closed property
				Object.defineProperty(mockSocket, "closed", {
					get: vi.fn(() => false),
					configurable: true,
				});

				expect(mockedClient.closed).toBe(false);

				// Change closed to true
				Object.defineProperty(mockSocket, "closed", {
					get: vi.fn(() => true),
					configurable: true,
				});

				expect(mockedClient.closed).toBe(true);
			});

			it("should report connecting status", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpClient(mockSocket);

				// Mock connecting property
				Object.defineProperty(mockSocket, "connecting", {
					get: vi.fn(() => true),
					configurable: true,
				});

				expect(mockedClient.connecting).toBe(true);

				// Change connecting to false
				Object.defineProperty(mockSocket, "connecting", {
					get: vi.fn(() => false),
					configurable: true,
				});

				expect(mockedClient.connecting).toBe(false);
			});

			it("should track bytesRead and bytesWritten", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpClient(mockSocket);

				// Mock bytes properties
				Object.defineProperty(mockSocket, "bytesRead", {
					get: vi.fn(() => 1234),
					configurable: true,
				});
				Object.defineProperty(mockSocket, "bytesWritten", {
					get: vi.fn(() => 5678),
					configurable: true,
				});

				expect(mockedClient.bytesRead).toBe(1234);
				expect(mockedClient.bytesWritten).toBe(5678);
			});

			it("should provide null remoteEndpoint when not connected", () => {
				const mockSocket = new net.Socket();
				const mockedClient = new TcpClient(mockSocket);

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
				const mockedClient = new TcpClient(mockSocket);

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
				const mockedClient = new TcpClient(mockSocket);

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
			const client = new TcpClient(mockSocket);

			const setKeepAliveSpy = vi.spyOn(mockSocket, "setKeepAlive");

			client.setKeepAlive(true, 1000);
			expect(setKeepAliveSpy).toHaveBeenNthCalledWith(1, true, 1000);

			client.setKeepAlive(false);
			expect(setKeepAliveSpy).toHaveBeenNthCalledWith(2, false, undefined);
		});

		it("should set no-delay", () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const setNoDelaySpy = vi.spyOn(mockSocket, "setNoDelay");

			client.setNoDelay(true);
			expect(setNoDelaySpy).toHaveBeenCalledWith(true);

			client.setNoDelay(false);
			expect(setNoDelaySpy).toHaveBeenCalledWith(false);
		});

		it("should ref and unref", () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const refSpy = vi.spyOn(mockSocket, "ref");
			const unrefSpy = vi.spyOn(mockSocket, "unref");

			client.ref();
			expect(refSpy).toHaveBeenCalled();

			client.unref();
			expect(unrefSpy).toHaveBeenCalled();

			client.ref();
			expect(refSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("connect", () => {
		it("should connect to a TCP server", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);
			expect(client.connecting).toBe(false);
			expect(client.closed).toBe(false);
			await client.end();
		});

		it("should connect with only port parameter", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort);
			expect(client.connecting).toBe(false);
			expect(client.closed).toBe(false);
			await client.end();
		});

		it("should reject on connection error", async () => {
			const client = TcpClient.from();
			// Try to connect to an invalid port
			await expect(client.connect(1, "0.0.0.0")).rejects.toThrow();
		});

		it("should reject on connection to non-existent host", async () => {
			const client = TcpClient.from();
			await expect(
				client.connect(serverPort, "invalid.host.example.com"),
			).rejects.toThrow();
		});

		it("should pass additional connection options", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost, {
				localPort: undefined, // Let system assign
			});
			expect(client.connecting).toBe(false);
			expect(client.closed).toBe(false);
			await client.end();
		});
	});

	describe("write", () => {
		let client: TcpClient;

		beforeEach(async () => {
			client = TcpClient.from();
			await client.connect(serverPort, serverHost);
		});

		afterEach(async () => {
			try {
				await client.end();
			} catch {
				// Ignore errors during cleanup
			}
		});

		it("should write string data to the socket", async () => {
			const testData = "Hello, World!";
			await client.write(testData);

			// Give server time to receive data
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThan(0);
			expect(receivedData[0]?.toString()).toBe(testData);
		});

		it("should write Uint8Array data to the socket", async () => {
			const testData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
			await client.write(testData);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThan(0);
			expect(receivedData[0]?.toString()).toBe("Hello");
		});

		it("should write string data with encoding option", async () => {
			const testData = "Hello, UTF-8!";
			await client.write(testData, { encoding: "utf8" });

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThan(0);
			expect(receivedData[0]?.toString("utf8")).toBe(testData);
		});

		it("should write string data with base64 encoding", async () => {
			const testData = "SGVsbG8="; // "Hello" in base64
			await client.write(testData, { encoding: "base64" });

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThan(0);
			expect(receivedData[0]?.toString()).toBe("Hello");
		});

		it("should reject when writing to a closed socket", async () => {
			await client.end();

			// Wait for socket to fully close
			await new Promise((resolve) => setTimeout(resolve, 50));

			await expect(client.write("test")).rejects.toThrow();
		});

		it("should handle multiple sequential writes", async () => {
			await client.write("First ");
			await client.write("Second ");
			await client.write("Third");

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThanOrEqual(1);
			const allData = Buffer.concat(receivedData).toString();
			expect(allData).toContain("First");
			expect(allData).toContain("Second");
			expect(allData).toContain("Third");
		});
	});

	describe("end", () => {
		let client: TcpClient;

		beforeEach(async () => {
			client = TcpClient.from();
			await client.connect(serverPort, serverHost);
		});

		it("should end the connection without waiting for close", async () => {
			await client.end();
			// Should resolve immediately after end is called
		});

		it("should end the connection and wait for close event", async () => {
			const startTime = Date.now();
			await client.end({ waitForClose: true });
			const duration = Date.now() - startTime;

			// Should have waited for close event
			expect(duration).toBeGreaterThanOrEqual(0);
			expect(client.closed).toBe(true);
		});

		it("should handle calling end multiple times", async () => {
			// First end call
			await client.end();

			// Second end call should also succeed without error
			await expect(client.end()).resolves.toBeUndefined();
		});

		it("should resolve quickly when not waiting for close", async () => {
			const startTime = Date.now();
			await client.end({ waitForClose: false });
			const duration = Date.now() - startTime;

			// Should resolve quickly without waiting for full close
			expect(duration).toBeLessThan(200);
		});
	});

	describe("error handling", () => {
		it("should handle connection refused error", async () => {
			// Use a port that is very unlikely to be in use
			const unusedPort = 54321;
			const client = TcpClient.from();

			await expect(client.connect(unusedPort, serverHost)).rejects.toThrow();
		});

		it("should propagate errors during write", async () => {
			const mockSocket = new net.Socket();

			// Create client with mock socket
			const testClient = new TcpClient(mockSocket);

			// Mock write to trigger error
			vi.spyOn(mockSocket, "write").mockImplementation(
				// biome-ignore lint/suspicious/noExplicitAny: test mock
				((_data: any, _encodingOrCallback?: any, callback?: any) => {
					const cb =
						typeof _encodingOrCallback === "function"
							? _encodingOrCallback
							: callback;
					if (cb) {
						setImmediate(() => cb(new Error("Write failed")));
					}
					return false;
				}) as typeof mockSocket.write,
			);

			await expect(testClient.write("test")).rejects.toThrow("Write failed");
		});

		it("should handle calling end multiple times on same connection", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			// End the connection normally
			await client.end({ waitForClose: true });

			// Calling end again should not throw even though socket is closed
			await expect(client.end()).resolves.toBeUndefined();
		});

		it("should handle end with immediate close", async () => {
			const mockSocket = new net.Socket();
			const testClient = new TcpClient(mockSocket);

			// Mock end to trigger close immediately
			vi.spyOn(mockSocket, "end").mockImplementation(function (
				this: net.Socket,
			) {
				setImmediate(() => this.emit("close", false));
				return this;
			});

			await expect(
				testClient.end({ waitForClose: true }),
			).resolves.toBeUndefined();
		});
	});

	describe("integration scenarios", () => {
		it("should handle full request-response cycle", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			// Write data
			const testData = "Test message";
			await client.write(testData);

			// Read response
			const response = await new Promise<string>((resolve) => {
				client.stream.once("data", (data: Buffer) => {
					resolve(data.toString());
				});
			});

			expect(response).toBe(testData);

			await client.end({ waitForClose: true });
		});

		it("should handle multiple connections sequentially", async () => {
			// First connection
			const client1 = TcpClient.from();
			await client1.connect(serverPort, serverHost);
			await client1.write("Connection 1");
			await client1.end();

			// Second connection
			const client2 = TcpClient.from();
			await client2.connect(serverPort, serverHost);
			await client2.write("Connection 2");
			await client2.end();

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBe(2);
		});

		it("should handle write after partial end (half-close)", async () => {
			const client = TcpClient.from({ allowHalfOpen: true });
			await client.connect(serverPort, serverHost);

			await client.write("Before end");
			await client.end();

			// After end(), client has sent FIN but can still receive
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedData.length).toBeGreaterThan(0);
		});

		it("should handle connection with data listener", async () => {
			const client = TcpClient.from();
			const dataChunks: Buffer[] = [];

			client.stream.on("data", (chunk: Buffer) => {
				dataChunks.push(chunk);
			});

			await client.connect(serverPort, serverHost);
			await client.write("Test data");

			// Wait for echo
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(dataChunks.length).toBeGreaterThan(0);
			expect(Buffer.concat(dataChunks).toString()).toBe("Test data");

			await client.end({ waitForClose: true });
		});
	});

	describe("events", () => {
		it("should emit connect event", async () => {
			const client = TcpClient.from();
			const connectPromise = new Promise<void>((resolve) => {
				client.once("connect", resolve);
			});

			await client.connect(serverPort, serverHost);
			await connectPromise;
			await client.end();
		});

		it("should emit ready event", async () => {
			const client = TcpClient.from();
			const readyPromise = new Promise<void>((resolve) => {
				client.once("ready", resolve);
			});

			await client.connect(serverPort, serverHost);
			await readyPromise;
			await client.end();
		});

		it("should emit close event", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			const closePromise = new Promise<boolean>((resolve) => {
				client.once("close", (arg) => {
					resolve(arg);
				});
			});

			await client.end();
			const hadError = await closePromise;
			expect(hadError).toBe(false);
		});

		it("should emit timeout event", async () => {
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			const timeoutPromise = new Promise<void>((resolve) => {
				client.once("timeout", resolve);
			});

			client.timeout = 10; // Very short timeout

			await timeoutPromise;
			await client.end();
		});

		it("should emit lookup event when connecting to hostname", async () => {
			const client = TcpClient.from();
			const lookupPromise = new Promise<void>((resolve) => {
				client.once("lookup", (err, address, host) => {
					expect(err).toBeNull();
					expect(address).toBeDefined();
					expect(address.address).toBeDefined();
					expect(address.family).toBeOneOf([4, 6, null]);
					expect(host).toBe("localhost");
					resolve();
				});
			});

			// Connect to 'localhost' to trigger DNS lookup
			await client.connect(serverPort, "localhost");
			await lookupPromise;
			await client.end();
		});

		it("should forward error events", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const testError = new Error("Socket error");

			const errorPromise = new Promise<Error>((resolve) => {
				client.once("error", (error) => {
					resolve(error);
				});
			});

			mockSocket.emit("error", testError);

			const receivedError = await errorPromise;
			expect(receivedError).toBe(testError);
		});

		it("should forward close events with hadError flag", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const closePromise = new Promise<boolean>((resolve) => {
				client.once("close", (error) => {
					resolve(error);
				});
			});

			mockSocket.emit("close", true);

			const hadError = await closePromise;
			expect(hadError).toBe(true);
		});

		it("should forward connect event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const connectPromise = new Promise<void>((resolve) => {
				client.once("connect", () => {
					resolve();
				});
			});

			mockSocket.emit("connect");

			await connectPromise;
		});

		it("should forward ready event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const readyPromise = new Promise<void>((resolve) => {
				client.once("ready", () => {
					resolve();
				});
			});

			mockSocket.emit("ready");

			await readyPromise;
		});

		it("should forward timeout event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const timeoutPromise = new Promise<void>((resolve) => {
				client.once("timeout", () => {
					resolve();
				});
			});

			mockSocket.emit("timeout");

			await timeoutPromise;
		});

		it("should forward connectionAttempt event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const testEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4 as const,
			};

			const eventPromise = new Promise<{
				address: string;
				port: number;
				family: 4 | 6 | null;
			}>((resolve) => {
				client.once("connectionAttempt", (ep) => {
					resolve(ep);
				});
			});

			mockSocket.emit("connectionAttempt", "127.0.0.1", 8080, 4);

			const endpoint = await eventPromise;
			expect(endpoint).toEqual(testEndpoint);
		});

		it("should forward connectionAttemptFailed event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const testError = new Error("Connection failed");
			const testEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4 as const,
			};

			const eventPromise = new Promise<{
				endpoint: { address: string; port: number; family: 4 | 6 | null };
				error: Error;
			}>((resolve) => {
				client.once("connectionAttemptFailed", (endpoint, error) => {
					resolve({ endpoint, error });
				});
			});

			mockSocket.emit(
				"connectionAttemptFailed",
				"127.0.0.1",
				8080,
				4,
				testError,
			);

			const result = await eventPromise;
			expect(result.endpoint).toEqual(testEndpoint);
			expect(result.error).toBe(testError);
		});

		it("should forward connectionAttemptTimeout event", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const testEndpoint = {
				address: "127.0.0.1",
				port: 8080,
				family: 4 as const,
			};

			const eventPromise = new Promise<{
				address: string;
				port: number;
				family: 4 | 6 | null;
			}>((resolve) => {
				client.once("connectionAttemptTimeout", (ep) => {
					resolve(ep);
				});
			});

			mockSocket.emit("connectionAttemptTimeout", "127.0.0.1", 8080, 4);

			const endpoint = await eventPromise;
			expect(endpoint).toEqual(testEndpoint);
		});

		it("should forward lookup event with IPv4", async () => {
			const mockSocket = new net.Socket();
			const client = new TcpClient(mockSocket);

			const eventPromise = new Promise<{
				err: Error | null;
				address: unknown;
				host: string;
			}>((resolve) => {
				client.once("lookup", (err, address, host) => {
					resolve({ err, address, host });
				});
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
			const client = new TcpClient(mockSocket);

			const eventPromise = new Promise<{
				err: Error | null;
				address: unknown;
				host: string;
			}>((resolve) => {
				client.once("lookup", (err, address, host) => {
					resolve({ err, address, host });
				});
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
});
