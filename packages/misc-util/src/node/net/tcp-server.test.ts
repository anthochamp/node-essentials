import * as net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InetEndpoint } from "./inet.js";
import { TcpClient } from "./tcp-client.js";
import { TcpServer } from "./tcp-server.js";

describe("TcpServer", () => {
	let server: TcpServer;
	let serverPort: number;
	let serverHost: string;

	beforeEach(() => {
		serverHost = "127.0.0.1";
	});

	afterEach(async () => {
		if (server?.listening) {
			await server.close();
		}
	});

	describe("from", () => {
		it("should create a new TcpServer instance", () => {
			server = TcpServer.from();
			expect(server).toBeInstanceOf(TcpServer);
		});

		it("should create a TcpServer with custom server options", () => {
			server = TcpServer.from({ allowHalfOpen: true });
			expect(server).toBeInstanceOf(TcpServer);
		});
	});

	describe("methods", () => {
		describe("listening server", () => {
			beforeEach(async () => {
				server = TcpServer.from();
				await server.listen(0, serverHost);
			});

			it("should ref and unref", () => {
				expect(() => server.ref()).not.toThrow();
				expect(() => server.unref()).not.toThrow();
				expect(() => server.ref()).not.toThrow();
			});

			it("should get address information", () => {
				const address = server.address();
				expect(address).not.toBeNull();
				expect(address).toHaveProperty("port");
			});
		});

		describe("methods", () => {
			it("should ref and unref", () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const refSpy = vi.spyOn(mockServer, "ref");
				const unrefSpy = vi.spyOn(mockServer, "unref");

				testServer.ref();
				expect(refSpy).toHaveBeenCalled();

				testServer.unref();
				expect(unrefSpy).toHaveBeenCalled();

				testServer.ref();
				expect(refSpy).toHaveBeenCalledTimes(2);
			});

			it("should get address information when listening", () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				// Mock address method to return address info
				vi.spyOn(mockServer, "address").mockReturnValue({
					address: "127.0.0.1",
					family: "IPv4",
					port: 8080,
				});

				const address = testServer.address();
				expect(address).not.toBeNull();
				expect(address?.address).toBe("127.0.0.1");
				expect(address?.port).toBe(8080);
				expect(address?.family).toBe(4);
			});

			it("should return null address when not listening", () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				// Mock address method to return null
				vi.spyOn(mockServer, "address").mockReturnValue(null);

				const address = testServer.address();
				expect(address).toBeNull();
			});
		});
	});

	describe("listen", () => {
		it("should start listening on a specified port", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			expect(server.listening).toBe(true);
			const address = server.address() as InetEndpoint;
			expect(address.port).toBeGreaterThan(0);
			expect(address.address).toBe(serverHost);
		});

		it("should start listening with only port parameter", async () => {
			server = TcpServer.from();
			await server.listen(0);

			expect(server.listening).toBe(true);
			const address = server.address() as InetEndpoint;
			expect(address.port).toBeGreaterThan(0);
		});

		it("should assign a random port when port is 0", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			expect(address.port).toBeGreaterThan(0);
		});

		it("should reject on bind error", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			const usedPort = address.port;

			// Try to bind another server to the same port
			const server2 = TcpServer.from();
			server2.on("error", () => {
				// Prevent unhandled error
			});

			await expect(server2.listen(usedPort, serverHost)).rejects.toThrow();
		});

		it("should pass additional listen options", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost, {
				backlog: 10,
			});

			expect(server.listening).toBe(true);
		});

		it("should remove error listener after successful listen", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			// Check that error listeners have been cleaned up
			const errorListenerCount = server.listenerCount("error");
			expect(errorListenerCount).toBe(0);
		});
	});

	describe("close", () => {
		it("should close the server", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);
			expect(server.listening).toBe(true);

			await server.close();
			expect(server.listening).toBe(false);
		});

		it("should reject when closing a non-listening server", async () => {
			server = TcpServer.from();
			await expect(server.close()).rejects.toThrow();
		});

		it("should allow closing after all connections are closed", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			// Connect a client
			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			// Close the client
			await client.end({ waitForClose: true });

			// Close the server
			await server.close();
			expect(server.listening).toBe(false);
		});
	});

	describe("address", () => {
		it("should return null when not listening", () => {
			server = TcpServer.from();
			expect(server.address()).toBeNull();
		});

		it("should return InetEndpoint when listening", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			expect(address).toBeDefined();
			expect(address.port).toBeGreaterThan(0);
			expect(address.address).toBe(serverHost);
			expect(address.family).toBeOneOf([4, 6]);
		});
	});

	describe("getConnections", () => {
		it("should return 0 when no connections", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const count = await server.getConnections();
			expect(count).toBe(0);
		});

		it("should return the correct connection count", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			// Connect a client
			const client1 = TcpClient.from();
			await client1.connect(serverPort, serverHost);

			// Wait for connection to be established
			await new Promise((resolve) => setTimeout(resolve, 50));

			const count1 = await server.getConnections();
			expect(count1).toBe(1);

			// Connect another client
			const client2 = TcpClient.from();
			await client2.connect(serverPort, serverHost);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const count2 = await server.getConnections();
			expect(count2).toBe(2);

			// Clean up
			await client1.end({ waitForClose: true });
			await client2.end({ waitForClose: true });
		});

		it("should decrease count when connections close", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			await new Promise((resolve) => setTimeout(resolve, 50));

			const countBefore = await server.getConnections();
			expect(countBefore).toBe(1);

			await client.end({ waitForClose: true });

			await new Promise((resolve) => setTimeout(resolve, 50));

			const countAfter = await server.getConnections();
			expect(countAfter).toBe(0);
		});
	});

	describe("listening", () => {
		it("should return false when not listening", () => {
			server = TcpServer.from();
			expect(server.listening).toBe(false);
		});

		it("should return true when listening", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);
			expect(server.listening).toBe(true);
		});

		it("should return false after closing", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);
			expect(server.listening).toBe(true);

			await server.close();
			expect(server.listening).toBe(false);
		});

		it("should report listening status", () => {
			const mockServer = net.createServer();
			const testServer = new TcpServer(mockServer);

			// Mock listening property
			Object.defineProperty(mockServer, "listening", {
				get: vi.fn(() => false),
				configurable: true,
			});

			expect(testServer.listening).toBe(false);

			// Change listening to true
			Object.defineProperty(mockServer, "listening", {
				get: vi.fn(() => true),
				configurable: true,
			});

			expect(testServer.listening).toBe(true);
		});
	});

	describe("maxConnections", () => {
		it("should get and set maxConnections", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			server.maxConnections = 5;
			expect(server.maxConnections).toBe(5);

			server.maxConnections = 10;
			expect(server.maxConnections).toBe(10);
		});

		it("should get and set maxConnections", () => {
			const mockServer = net.createServer();
			const testServer = new TcpServer(mockServer);

			// Mock maxConnections property
			let maxConns = 0;
			Object.defineProperty(mockServer, "maxConnections", {
				get: vi.fn(() => maxConns),
				set: vi.fn((value) => {
					maxConns = value;
				}),
				configurable: true,
			});

			testServer.maxConnections = 5;
			expect(testServer.maxConnections).toBe(5);

			testServer.maxConnections = 10;
			expect(testServer.maxConnections).toBe(10);
		});
	});

	describe("event listeners", () => {
		describe("on", () => {
			it("should register connection event listener", async () => {
				server = TcpServer.from();
				const connections: TcpClient[] = [];

				server.on("connection", (connectedClient) => {
					connections.push(connectedClient);
				});

				await server.listen(0, serverHost);

				const address = server.address() as InetEndpoint;
				serverPort = address.port;

				const client = TcpClient.from();
				await client.connect(serverPort, serverHost);

				await new Promise((resolve) => setTimeout(resolve, 50));

				expect(connections.length).toBe(1);
				expect(connections[0]).toBeInstanceOf(TcpClient);

				await client.end({ waitForClose: true });
			});

			it("should register listening event listener", async () => {
				server = TcpServer.from();
				let listeningCalled = false;

				server.on("listening", () => {
					listeningCalled = true;
				});

				await server.listen(0, serverHost);

				expect(listeningCalled).toBe(true);
			});

			it("should register close event listener", async () => {
				server = TcpServer.from();
				let closeCalled = false;

				server.on("close", () => {
					closeCalled = true;
				});

				await server.listen(0, serverHost);
				await server.close();

				expect(closeCalled).toBe(true);
			});

			it("should register error event listener", async () => {
				server = TcpServer.from();
				let errorReceived = false;

				server.on("error", () => {
					errorReceived = true;
				});

				await server.listen(0, serverHost);

				// Error event test - simply verify the listener can be registered
				expect(errorReceived).toBe(false);
			});
			it("should return this for chaining", () => {
				server = TcpServer.from();
				const result = server.on("connection", () => {});
				expect(result).toBe(server);
			});
		});

		describe("once", () => {
			it("should register one-time connection event listener", async () => {
				server = TcpServer.from();
				let connectionCount = 0;

				server.once("connection", () => {
					connectionCount++;
				});

				await server.listen(0, serverHost);

				const address = server.address() as InetEndpoint;
				serverPort = address.port;

				const client1 = TcpClient.from();
				await client1.connect(serverPort, serverHost);

				await new Promise((resolve) => setTimeout(resolve, 50));

				expect(connectionCount).toBe(1);

				const client2 = TcpClient.from();
				await client2.connect(serverPort, serverHost);

				await new Promise((resolve) => setTimeout(resolve, 50));

				// Should still be 1 because it's a one-time listener
				expect(connectionCount).toBe(1);

				await client1.end({ waitForClose: true });
				await client2.end({ waitForClose: true });
			});

			it("should return this for chaining", () => {
				server = TcpServer.from();
				const result = server.once("connection", () => {});
				expect(result).toBe(server);
			});
		});

		describe("off", () => {
			it("should remove connection event listener", async () => {
				server = TcpServer.from();
				let connectionCount = 0;

				const listener = () => {
					connectionCount++;
				};

				server.on("connection", listener);
				await server.listen(0, serverHost);

				const address = server.address() as InetEndpoint;
				serverPort = address.port;

				const client1 = TcpClient.from();
				await client1.connect(serverPort, serverHost);

				await new Promise((resolve) => setTimeout(resolve, 50));

				expect(connectionCount).toBe(1);

				// Remove the listener
				server.off("connection", listener);

				const client2 = TcpClient.from();
				await client2.connect(serverPort, serverHost);

				await new Promise((resolve) => setTimeout(resolve, 50));

				// Should still be 1 because listener was removed
				expect(connectionCount).toBe(1);

				await client1.end({ waitForClose: true });
				await client2.end({ waitForClose: true });
			});

			it("should return this for chaining", () => {
				server = TcpServer.from();
				const listener = () => {};
				const result = server.off("connection", listener);
				expect(result).toBe(server);
			});
		});
	});

	describe("integration scenarios", () => {
		it("should handle echo server pattern", async () => {
			server = TcpServer.from();

			server.on("connection", (connectedClient) => {
				connectedClient.stream.on("data", async (data: Buffer) => {
					await connectedClient.write(data);
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			const testData = "Hello, World!";
			await client.write(testData);

			const response = await new Promise<string>((resolve) => {
				client.stream.once("data", (data: Buffer) => {
					resolve(data.toString());
				});
			});

			expect(response).toBe(testData);

			await client.end({ waitForClose: true });
		});

		it("should handle multiple concurrent connections", async () => {
			server = TcpServer.from();
			const receivedData: string[] = [];

			server.on("connection", (connectedClient) => {
				connectedClient.stream.on("data", (data: Buffer) => {
					receivedData.push(data.toString());
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			// Connect multiple clients
			const client1 = TcpClient.from();
			await client1.connect(serverPort, serverHost);

			const client2 = TcpClient.from();
			await client2.connect(serverPort, serverHost);

			const client3 = TcpClient.from();
			await client3.connect(serverPort, serverHost);

			// Send data from each client
			await client1.write("Client 1");
			await client2.write("Client 2");
			await client3.write("Client 3");

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(receivedData.length).toBe(3);
			expect(receivedData).toContain("Client 1");
			expect(receivedData).toContain("Client 2");
			expect(receivedData).toContain("Client 3");

			// Clean up
			await client1.end({ waitForClose: true });
			await client2.end({ waitForClose: true });
			await client3.end({ waitForClose: true });
		});

		it("should handle client disconnect gracefully", async () => {
			server = TcpServer.from();
			let disconnectCount = 0;

			const disconnectPromise = new Promise<void>((resolve) => {
				server.on("connection", (connectedClient) => {
					connectedClient.stream.on("end", () => {
						disconnectCount++;
						resolve();
					});
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			await client.end({ waitForClose: true });

			// Wait for the disconnect event
			await disconnectPromise;

			expect(disconnectCount).toBe(1);
		});

		it("should handle binary data", async () => {
			server = TcpServer.from();
			const receivedBuffers: Buffer[] = [];

			server.on("connection", (connectedClient) => {
				connectedClient.stream.on("data", (data: Buffer) => {
					receivedBuffers.push(data);
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			const testData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
			await client.write(testData);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(receivedBuffers.length).toBeGreaterThan(0);
			expect(receivedBuffers[0]?.toString()).toBe("Hello");

			await client.end({ waitForClose: true });
		});

		it("should handle request-response pattern", async () => {
			server = TcpServer.from();

			server.on("connection", (connectedClient) => {
				connectedClient.stream.on("data", async (data: Buffer) => {
					const request = data.toString();
					if (request === "PING") {
						await connectedClient.write("PONG");
					}
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			await client.write("PING");

			const response = await new Promise<string>((resolve) => {
				client.stream.once("data", (data: Buffer) => {
					resolve(data.toString());
				});
			});

			expect(response).toBe("PONG");

			await client.end({ waitForClose: true });
		});
	});

	describe("events", () => {
		it("should emit connection event with TcpClient instance", async () => {
			server = TcpServer.from();
			const connectionPromise = new Promise<TcpClient>((resolve) => {
				server.once("connection", (arg) => {
					resolve(arg);
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			const client = TcpClient.from();
			await client.connect(serverPort, serverHost);

			const connectedClient = await connectionPromise;
			expect(connectedClient).toBeInstanceOf(TcpClient);

			await client.end({ waitForClose: true });
		});

		it("should emit listening event", async () => {
			server = TcpServer.from();
			const listeningPromise = new Promise<void>((resolve) => {
				server.once("listening", resolve);
			});

			await server.listen(0, serverHost);
			await listeningPromise;
		});

		it("should emit close event", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const closePromise = new Promise<void>((resolve) => {
				server.once("close", resolve);
			});

			await server.close();
			await closePromise;
		});

		it("should emit error event", async () => {
			server = TcpServer.from();
			await server.listen(0, serverHost);

			const testError = new Error("Connection error");

			const errorPromise = new Promise<Error>((resolve) => {
				server.once("error", (err) => {
					resolve(err);
				});
			});

			// Emit an error directly on the underlying server to test error forwarding
			// (Note: bind errors are handled specially by listen() and won't be re-emitted)
			// biome-ignore lint/suspicious/noExplicitAny: accessing private property for testing
			(server as any).srv.emit("error", testError);

			const error = await errorPromise;
			expect(error).toBe(testError);
		});
		it("should emit drop event with endpoint information", async () => {
			server = TcpServer.from();

			// Set maxConnections to 0 to trigger drop events
			server.maxConnections = 0;

			const dropPromise = new Promise<{
				local: InetEndpoint | null;
				remote: InetEndpoint | null;
			}>((resolve) => {
				server.once("drop", (localEndpoint, remoteEndpoint) => {
					resolve({ local: localEndpoint, remote: remoteEndpoint });
				});
			});

			await server.listen(0, serverHost);

			const address = server.address() as InetEndpoint;
			serverPort = address.port;

			// Try to connect (should be dropped due to maxConnections = 0)
			const client = TcpClient.from();
			client.connect(serverPort, serverHost).catch(() => {
				// Expected to be dropped or fail
			});

			const { local, remote } = await dropPromise;

			// Verify that endpoints are provided (or null if not available)
			if (local !== null) {
				expect(local).toHaveProperty("address");
				expect(local).toHaveProperty("port");
				expect(local).toHaveProperty("family");
			}

			if (remote !== null) {
				expect(remote).toHaveProperty("address");
				expect(remote).toHaveProperty("port");
				expect(remote).toHaveProperty("family");
			}

			// Clean up
			try {
				await client.end();
			} catch {
				// Ignore errors during cleanup
			}
		});

		describe("event forwarding", () => {
			it("should forward connection event", async () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const connectionPromise = new Promise<TcpClient>((resolve) => {
					testServer.once("connection", (client) => {
						resolve(client);
					});
				});

				const mockSocket = new net.Socket();
				mockServer.emit("connection", mockSocket);

				const client = await connectionPromise;
				expect(client).toBeInstanceOf(TcpClient);
			});

			it("should forward listening event", async () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const listeningPromise = new Promise<void>((resolve) => {
					testServer.once("listening", () => {
						resolve();
					});
				});

				mockServer.emit("listening");

				await listeningPromise;
			});

			it("should forward close event", async () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const closePromise = new Promise<void>((resolve) => {
					testServer.once("close", () => {
						resolve();
					});
				});

				mockServer.emit("close");

				await closePromise;
			});

			it("should forward error event", async () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const testError = new Error("Server error");

				const errorPromise = new Promise<Error>((resolve) => {
					testServer.once("error", (error) => {
						resolve(error);
					});
				});

				mockServer.emit("error", testError);

				const receivedError = await errorPromise;
				expect(receivedError).toBe(testError);
			});

			it("should forward drop event with endpoints", async () => {
				const mockServer = net.createServer();
				const testServer = new TcpServer(mockServer);

				const dropPromise = new Promise<{
					local: InetEndpoint | null;
					remote: InetEndpoint | null;
				}>((resolve) => {
					testServer.once("drop", (local, remote) => {
						resolve({ local, remote });
					});
				});

				const mockData = {
					localAddress: "127.0.0.1",
					localPort: 8080,
					localFamily: "IPv4",
					remoteAddress: "192.168.1.100",
					remotePort: 54321,
					remoteFamily: "IPv4",
				};

				mockServer.emit("drop", mockData);
				const { local, remote } = await dropPromise;
				expect(local).toEqual({
					address: "127.0.0.1",
					port: 8080,
					family: 4,
				});
				expect(remote).toEqual({
					address: "192.168.1.100",
					port: 54321,
					family: 4,
				});
			});
		});
	});
});
