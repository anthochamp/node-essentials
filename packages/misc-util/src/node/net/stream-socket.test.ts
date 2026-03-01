import * as net from "node:net";
import { describe, expect, it, vi } from "vitest";
import type { IError } from "../../ecma/error/error.js";
import { StreamSocket } from "./stream-socket.js";

describe("StreamSocket", () => {
	it("should expose basic properties from underlying socket", () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);

		Object.defineProperty(underlying, "closed", { value: false });
		Object.defineProperty(underlying, "destroyed", { value: false });
		Object.defineProperty(underlying, "bytesRead", { value: 10 });
		Object.defineProperty(underlying, "bytesWritten", { value: 20 });
		Object.defineProperty(underlying, "connecting", { value: true });
		Object.defineProperty(underlying, "timeout", { value: 1234 });

		expect(socket.stream).toBe(underlying);
		expect(socket.closed).toBe(false);
		expect(socket.destroyed).toBe(false);
		expect(socket.bytesRead).toBe(10);
		expect(socket.bytesWritten).toBe(20);
		expect(socket.connecting).toBe(true);
		expect(socket.timeout).toBe(1234);
	});

	it("should set timeout via underlying setTimeout", () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const setTimeoutSpy = vi.spyOn(underlying, "setTimeout");

		socket.timeout = 5000;
		expect(setTimeoutSpy).toHaveBeenCalledWith(5000);

		socket.timeout = null;
		expect(setTimeoutSpy).toHaveBeenCalledWith(0);
	});

	it("should delegate ref and unref to underlying socket", () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const refSpy = vi.spyOn(underlying, "ref");
		const unrefSpy = vi.spyOn(underlying, "unref");

		socket.ref();
		socket.unref();

		expect(refSpy).toHaveBeenCalledTimes(1);
		expect(unrefSpy).toHaveBeenCalledTimes(1);
	});

	it("should resolve end when socket ends without close wait", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const endSpy = vi.spyOn(underlying, "end");

		Object.defineProperty(underlying, "closed", {
			value: false,
			configurable: true,
		});

		const promise = socket.end();
		const endCall = endSpy.mock.calls[0];
		if (!endCall) {
			throw new Error("end call not captured");
		}
		const endCallback = endCall[0] as unknown as (() => void) | undefined;
		if (endCallback) {
			endCallback();
		}

		await expect(promise).resolves.toBeUndefined();
	});

	it("should resolve end when waitForClose is true and close event fires", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const endSpy = vi.spyOn(underlying, "end");

		Object.defineProperty(underlying, "closed", {
			value: false,
			configurable: true,
		});

		const promise = socket.end({ waitForClose: true });
		const endCall = endSpy.mock.calls[0];
		if (!endCall) {
			throw new Error("end call not captured");
		}
		const endCallback = endCall[0] as unknown as (() => void) | undefined;
		if (endCallback) {
			endCallback();
		}

		underlying.emit("close", false);

		await expect(promise).resolves.toBeUndefined();
	});

	it("should reject end on error and mark error as handled", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);

		Object.defineProperty(underlying, "closed", {
			value: false,
			configurable: true,
		});

		const promise = socket.end();
		const error: IError = new Error("end-failure") as IError;
		underlying.emit("error", error);

		await expect(promise).rejects.toBe(error);
	});

	it("should write data and resolve when underlying write succeeds", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const writeSpy = vi.spyOn(underlying, "write");

		const promise = socket.write(Buffer.from("abc"));
		const writeCall = writeSpy.mock.calls[0];
		if (!writeCall) {
			throw new Error("write call not captured");
		}
		const callback = writeCall[1] as unknown as
			| ((err?: IError | null) => void)
			| undefined;
		if (!callback) {
			throw new Error("write callback not captured");
		}
		callback(null);

		await expect(promise).resolves.toBeUndefined();
	});

	it("should reject write when underlying write callback receives error", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const writeSpy = vi.spyOn(underlying, "write");
		const error: IError = new Error("write-failure") as IError;

		const promise = socket.write(Buffer.from("abc"));
		const writeCall = writeSpy.mock.calls[0];
		if (!writeCall) {
			throw new Error("write call not captured");
		}
		const callback = writeCall[1] as unknown as
			| ((err?: IError | null) => void)
			| undefined;
		if (!callback) {
			throw new Error("write callback not captured");
		}
		callback(error);

		await expect(promise).rejects.toBe(error);
	});

	it("should forward destroy to underlying socket", () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);
		const destroySpy = vi.spyOn(underlying, "destroy");

		socket.destroy();

		expect(destroySpy).toHaveBeenCalledTimes(1);
	});

	it("should dispatch forwarded events from underlying socket", async () => {
		const underlying = new net.Socket();
		const socket = new StreamSocket(underlying);

		const events: { type: string; payload?: unknown }[] = [];

		await Promise.resolve();

		socket.subscribe("error", (err) => {
			events.push({ type: "error", payload: err });
		});
		socket.subscribe("close", (hadError) => {
			events.push({ type: "close", payload: hadError });
		});
		socket.subscribe("connect", () => {
			events.push({ type: "connect" });
		});
		socket.subscribe("ready", () => {
			events.push({ type: "ready" });
		});
		socket.subscribe("timeout", () => {
			events.push({ type: "timeout" });
		});

		const forwardedError: IError = new Error("boom") as IError;
		underlying.emit("error", forwardedError);
		underlying.emit("close", true);
		underlying.emit("connect");
		underlying.emit("ready");
		underlying.emit("timeout");

		expect(events).toContainEqual({ type: "close", payload: true });
		expect(events).toContainEqual({ type: "connect" });
		expect(events).toContainEqual({ type: "ready" });
		expect(events).toContainEqual({ type: "timeout" });
		expect(events.find((e) => e.type === "error")?.payload).toBe(
			forwardedError,
		);
	});
});
