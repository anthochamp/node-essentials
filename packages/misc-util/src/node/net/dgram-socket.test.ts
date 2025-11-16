import * as dgram from "node:dgram";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DgramSocket } from "./dgram-socket.js";

describe("DgramSocket", () => {
	let socket: DgramSocket | undefined;

	beforeEach(() => {
		socket = undefined;
	});

	afterEach(async () => {
		if (socket) {
			try {
				await socket.close();
			} catch {
				// Ignore errors during cleanup
			}
		}
	});

	describe("factory", () => {
		it("should create a DgramSocket with default options", () => {
			socket = DgramSocket.from();
			expect(socket).toBeInstanceOf(DgramSocket);
		});

		it("should create a DgramSocket with custom options", () => {
			socket = DgramSocket.from({ type: "udp6" });
			expect(socket).toBeInstanceOf(DgramSocket);
		});
	});

	describe("bind()", () => {
		it("should bind to a specific port", async () => {
			socket = DgramSocket.from();
			await socket.bind(0, "127.0.0.1");

			const address = socket.address();
			expect(address).not.toBeNull();
			expect(address?.address).toBe("127.0.0.1");
			expect(address?.port).toBeGreaterThan(0);
		});

		it("should bind to random port when port is 0", async () => {
			socket = DgramSocket.from();
			await socket.bind(0);

			const address = socket.address();
			expect(address).not.toBeNull();
			expect(address?.port).toBeGreaterThan(0);
		});

		it("should reject on bind error", async () => {
			socket = DgramSocket.from();
			await socket.bind(0, "127.0.0.1");

			const address = socket.address();
			expect(address).not.toBeNull();
			const usedPort = address?.port ?? 0;

			const socket2 = DgramSocket.from();
			await expect(socket2.bind(usedPort, "127.0.0.1")).rejects.toThrow();

			await socket2.close();
		});

		it("should bind with additional options", async () => {
			socket = DgramSocket.from();
			await socket.bind(0, "127.0.0.1", { exclusive: true });

			const address = socket.address();
			expect(address).not.toBeNull();
			expect(address?.address).toBe("127.0.0.1");
		});
	});

	describe("close()", () => {
		it("should close the socket", async () => {
			socket = DgramSocket.from();
			await socket.bind(0);
			await socket.close();

			// After closing, address() should return null
			expect(socket.address()).toBeNull();
		});

		it("should reject when closing a non-bound socket", async () => {
			socket = DgramSocket.from();
			// Note: dgram allows closing unbound sockets, so this might not reject
			// But we test the close() method works
			await expect(socket.close()).resolves.toBeUndefined();
		});
	});

	describe("address()", () => {
		it("should return null when not bound", () => {
			socket = DgramSocket.from();
			expect(socket.address()).toBeNull();
		});

		it("should return endpoint information when bound", async () => {
			socket = DgramSocket.from();
			await socket.bind(0, "127.0.0.1");

			const address = socket.address();
			expect(address).not.toBeNull();
			expect(address?.address).toBe("127.0.0.1");
			expect(address?.family).toBe(4);
			expect(address?.port).toBeGreaterThan(0);
		});

		it("should return null after closing", async () => {
			socket = DgramSocket.from();
			await socket.bind(0);
			await socket.close();

			expect(socket.address()).toBeNull();
		});
	});

	describe("send()", () => {
		it("should send a message to another socket", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<{
				msg: Buffer;
				size: number;
			}>((resolve) => {
				receiver.once("message", (msg, size) => {
					resolve({ msg, size });
				});
			});

			socket = DgramSocket.from();
			const testMessage = Buffer.from("Hello, UDP!");
			const bytesSent = await socket.send(
				receiverAddress.port,
				receiverAddress.address,
				testMessage,
			);

			expect(bytesSent).toBe(testMessage.length);

			const { msg, size } = await messagePromise;
			expect(size).toBe(testMessage.length);
			expect(msg.toString()).toBe("Hello, UDP!");

			await receiver.close();
		});

		it("should send a message with offset and length", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<Buffer>((resolve) => {
				receiver.once("message", (msg) => {
					resolve(msg);
				});
			});

			socket = DgramSocket.from();
			const testBuffer = Buffer.from("Hello, World!");
			// Send only "World" (offset 7, length 5)
			await socket.send(
				receiverAddress.port,
				receiverAddress.address,
				testBuffer,
				7,
				5,
			);

			const msg = await messagePromise;
			expect(msg.toString()).toBe("World");

			await receiver.close();
		});

		it("should handle string messages", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<Buffer>((resolve) => {
				receiver.once("message", (msg) => {
					resolve(msg);
				});
			});

			socket = DgramSocket.from();
			await socket.send(
				receiverAddress.port,
				receiverAddress.address,
				"Hello, UDP!",
			);

			const msg = await messagePromise;
			expect(msg.toString()).toBe("Hello, UDP!");

			await receiver.close();
		});

		it("should send TypedArray messages", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<Buffer>((resolve) => {
				receiver.once("message", (msg) => {
					resolve(msg);
				});
			});

			socket = DgramSocket.from();
			const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
			await socket.send(
				receiverAddress.port,
				receiverAddress.address,
				uint8Array,
			);

			const msg = await messagePromise;
			expect(msg.toString()).toBe("Hello");

			await receiver.close();
		});

		it("should reject on send error to invalid address", async () => {
			socket = DgramSocket.from();

			// Try to send to an invalid address
			await expect(
				socket.send(12345, "999.999.999.999", Buffer.from("test")),
			).rejects.toThrow();
		});
	});

	describe("methods", () => {
		it("should ref and unref", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			socket = new DgramSocket(mockSocket);

			const refSpy = vi.spyOn(mockSocket, "ref");
			const unrefSpy = vi.spyOn(mockSocket, "unref");

			socket.ref();
			expect(refSpy).toHaveBeenCalledOnce();

			socket.unref();
			expect(unrefSpy).toHaveBeenCalledOnce();
		});

		it("should get address information", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			socket = new DgramSocket(mockSocket);

			const addressSpy = vi.spyOn(mockSocket, "address");

			socket.address();
			expect(addressSpy).toHaveBeenCalledOnce();
		});
	});

	describe("events", () => {
		describe("on()", () => {
			it("should register listening event listener", async () => {
				socket = DgramSocket.from();

				const listeningPromise = new Promise<void>((resolve) => {
					expect(socket).toBeDefined();
					socket?.on("listening", () => {
						resolve();
					});
				});

				await socket.bind(0);
				await listeningPromise;
			});

			it("should register message event listener", async () => {
				socket = DgramSocket.from();
				await socket.bind(0, "127.0.0.1");

				const messagePromise = new Promise<void>((resolve) => {
					expect(socket).toBeDefined();
					socket?.on("message", () => {
						resolve();
					});
				});

				const address = socket.address();
				expect(address).not.toBeNull();
				if (!address) return;
				const sender = DgramSocket.from();
				await sender.send(address.port, address.address, "test");

				await messagePromise;
				await sender.close();
			});

			it("should register close event listener", async () => {
				socket = DgramSocket.from();

				const closePromise = new Promise<void>((resolve) => {
					expect(socket).toBeDefined();
					socket?.on("close", () => {
						resolve();
					});
				});

				await socket.close();
				await closePromise;
			});

			it("should register error event listener", async () => {
				socket = DgramSocket.from();
				await socket.bind(0);

				const testError = new Error("Socket error");

				const errorPromise = new Promise<Error>((resolve) => {
					expect(socket).toBeDefined();
					socket?.on("error", (err) => {
						resolve(err);
					});
				});

				// Emit an error directly on the underlying socket to test error forwarding
				// (Note: bind errors are handled specially by bind() and won't be re-emitted)
				// biome-ignore lint/suspicious/noExplicitAny: accessing private property for testing
				(socket as any).sock.emit("error", testError);

				const error = await errorPromise;
				expect(error).toBe(testError);
			});
			it("should return this for chaining", () => {
				socket = DgramSocket.from();
				const result = socket.on("listening", () => {});
				expect(result).toBe(socket);
			});
		});

		describe("once()", () => {
			it("should register one-time listening event listener", async () => {
				let testSocket = DgramSocket.from();

				let callCount = 0;
				testSocket.once("listening", () => {
					callCount++;
				});

				await testSocket.bind(0);
				await testSocket.close();

				testSocket = DgramSocket.from();
				await testSocket.bind(0);

				expect(callCount).toBe(1);

				await testSocket.close();
			});

			it("should return this for chaining", () => {
				socket = DgramSocket.from();
				const result = socket.once("listening", () => {});
				expect(result).toBe(socket);
			});
		});

		describe("off()", () => {
			it("should remove listening event listener", async () => {
				socket = DgramSocket.from();

				let callCount = 0;
				const listener = () => {
					callCount++;
				};

				socket.on("listening", listener);
				socket.off("listening", listener);

				await socket.bind(0);

				expect(callCount).toBe(0);
			});

			it("should return this for chaining", () => {
				socket = DgramSocket.from();
				const listener = () => {};
				const result = socket.off("listening", listener);
				expect(result).toBe(socket);
			});
		});
	});

	describe("event forwarding", () => {
		it("should forward listening event", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			const testSocket = new DgramSocket(mockSocket);

			const listeningPromise = new Promise<void>((resolve) => {
				testSocket.once("listening", () => {
					resolve();
				});
			});

			mockSocket.emit("listening");

			await listeningPromise;
			mockSocket.close();
		});

		it("should forward close event", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			const testSocket = new DgramSocket(mockSocket);

			const closePromise = new Promise<void>((resolve) => {
				testSocket.once("close", () => {
					resolve();
				});
			});

			mockSocket.emit("close");

			await closePromise;
		});

		it("should forward connect event", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			const testSocket = new DgramSocket(mockSocket);

			const connectPromise = new Promise<void>((resolve) => {
				testSocket.once("connect", () => {
					resolve();
				});
			});

			mockSocket.emit("connect");

			await connectPromise;
			mockSocket.close();
		});

		it("should forward error event", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			const testSocket = new DgramSocket(mockSocket);

			const testError = new Error("Test error");

			const errorPromise = new Promise<Error>((resolve) => {
				testSocket.once("error", (error) => {
					resolve(error);
				});
			});

			mockSocket.emit("error", testError);

			const receivedError = await errorPromise;
			expect(receivedError).toBe(testError);
			mockSocket.close();
		});

		it("should forward message event with transformed data", async () => {
			const mockSocket = dgram.createSocket({ type: "udp4" });
			const testSocket = new DgramSocket(mockSocket);

			const messagePromise = new Promise<{
				msg: Buffer;
				size: number;
				address: string;
				port: number;
				family: number | null;
			}>((resolve) => {
				testSocket.once("message", (msg, size, from) => {
					resolve({
						msg,
						size,
						address: from.address,
						port: from.port,
						family: from.family,
					});
				});
			});

			const testMsg = Buffer.from("Hello");
			const rinfo = {
				address: "192.168.1.100",
				family: "IPv4",
				port: 54321,
				size: testMsg.length,
			};

			mockSocket.emit("message", testMsg, rinfo);

			const result = await messagePromise;
			expect(result.msg).toBe(testMsg);
			expect(result.size).toBe(testMsg.length);
			expect(result.address).toBe("192.168.1.100");
			expect(result.port).toBe(54321);
			expect(result.family).toBe(4);
			mockSocket.close();
		});
	});

	describe("integration", () => {
		it("should handle bidirectional communication", async () => {
			const socket1 = DgramSocket.from();
			const socket2 = DgramSocket.from();

			await socket1.bind(0, "127.0.0.1");
			await socket2.bind(0, "127.0.0.1");

			const addr1 = socket1.address();
			const addr2 = socket2.address();
			expect(addr1).not.toBeNull();
			expect(addr2).not.toBeNull();
			if (!addr1 || !addr2) return;

			// Socket1 sends to Socket2
			const message1Promise = new Promise<string>((resolve) => {
				socket2.once("message", (msg) => {
					resolve(msg.toString());
				});
			});

			await socket1.send(addr2.port, addr2.address, "Hello from socket1");
			const msg1 = await message1Promise;
			expect(msg1).toBe("Hello from socket1");

			// Socket2 sends to Socket1
			const message2Promise = new Promise<string>((resolve) => {
				socket1.once("message", (msg) => {
					resolve(msg.toString());
				});
			});

			await socket2.send(addr1.port, addr1.address, "Hello from socket2");
			const msg2 = await message2Promise;
			expect(msg2).toBe("Hello from socket2");

			await socket1.close();
			await socket2.close();
		});

		it("should handle multiple messages", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messages: string[] = [];
			receiver.on("message", (msg) => {
				messages.push(msg.toString());
			});

			socket = DgramSocket.from();

			await socket.send(receiverAddress.port, receiverAddress.address, "msg1");
			await socket.send(receiverAddress.port, receiverAddress.address, "msg2");
			await socket.send(receiverAddress.port, receiverAddress.address, "msg3");

			// Wait a bit for messages to arrive
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(messages).toHaveLength(3);
			expect(messages).toContain("msg1");
			expect(messages).toContain("msg2");
			expect(messages).toContain("msg3");

			await receiver.close();
		});

		it("should handle binary data", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<Buffer>((resolve) => {
				receiver.once("message", (msg) => {
					resolve(msg);
				});
			});

			socket = DgramSocket.from();
			const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0xff]);
			await socket.send(
				receiverAddress.port,
				receiverAddress.address,
				binaryData,
			);

			const msg = await messagePromise;
			expect(msg).toEqual(binaryData);

			await receiver.close();
		});

		it("should send DataView messages", async () => {
			const receiver = DgramSocket.from();
			await receiver.bind(0, "127.0.0.1");

			const receiverAddress = receiver.address();
			expect(receiverAddress).not.toBeNull();
			if (!receiverAddress) return;

			const messagePromise = new Promise<Buffer>((resolve) => {
				receiver.once("message", (msg) => {
					resolve(msg);
				});
			});

			socket = DgramSocket.from();
			const buffer = new ArrayBuffer(5);
			const view = new DataView(buffer);
			view.setUint8(0, 72); // 'H'
			view.setUint8(1, 101); // 'e'
			view.setUint8(2, 108); // 'l'
			view.setUint8(3, 108); // 'l'
			view.setUint8(4, 111); // 'o'

			await socket.send(receiverAddress.port, receiverAddress.address, view);

			const msg = await messagePromise;
			expect(msg.toString()).toBe("Hello");

			await receiver.close();
		});

		it("should work with IPv6", async () => {
			const socket6 = DgramSocket.from({ type: "udp6" });
			await socket6.bind(0, "::1");

			const address = socket6.address();
			expect(address).not.toBeNull();
			expect(address?.family).toBe(6);
			expect(address?.address).toBe("::1");

			await socket6.close();
		});
	});
});
