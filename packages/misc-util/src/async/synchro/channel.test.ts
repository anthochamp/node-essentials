import { describe, expect, it } from "vitest";
import { Channel, ChannelClosedError } from "./channel.js";

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Channel (rendezvous, capacity = 0)", () => {
	it("receive aborts with AbortSignal", async () => {
		const ch = new Channel<number>(0);
		const abort = new AbortController();
		const p = ch.receive(abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
	});
	it("send aborts with AbortSignal", async () => {
		const ch = new Channel<number>(0);
		const abort = new AbortController();
		const p = ch.send(42, abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
	});

	it("send/receive rendezvous: both block until paired", async () => {
		const ch = new Channel<number>(0);
		let received: number | undefined;
		const recv = Promise.resolve(ch.receive()).then((v) => (received = v));
		await delay(10); // ensure receive is waiting
		const send = ch.send(42);
		await send;
		await recv;
		expect(received).toBe(42);
	});

	it("send blocks until receive arrives", async () => {
		const ch = new Channel<number>(0);
		let sent = false;
		const send = ch.send(7).then(() => (sent = true));
		await delay(10);
		expect(sent).toBe(false);
		await ch.receive();
		await send;
		expect(sent).toBe(true);
	});

	it("receive blocks until send arrives", async () => {
		const ch = new Channel<number>(0);
		let received: number | undefined;
		const recv = Promise.resolve(ch.receive()).then((v) => (received = v));
		await delay(10);
		expect(received).toBeUndefined();
		await ch.send(99);
		await recv;
		expect(received).toBe(99);
	});

	it("send/receive throw if closed", async () => {
		const ch = new Channel<number>(0);
		ch.close();
		await expect(ch.send(1)).rejects.toThrow(ChannelClosedError);
		await expect(ch.receive()).rejects.toThrow(ChannelClosedError);
	});
});

describe("Channel (async, capacity = Infinity)", () => {
	it("receive aborts with AbortSignal", async () => {
		const ch = new Channel<number>(Infinity);
		const abort = new AbortController();
		const p = ch.receive(abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
	});
	it("send aborts with AbortSignal (buffer full)", async () => {
		const ch = new Channel<number>(Infinity);
		// Buffer never fills, so abort is not relevant for send in this mode
		// But we can still test that aborting a send does not throw if not blocked
		const abort = new AbortController();
		await expect(ch.send(1, abort.signal)).resolves.toBeUndefined();
		abort.abort();
	});
	it("send never blocks, receive gets values in order", async () => {
		const ch = new Channel<number>(Infinity);
		await ch.send(1);
		await ch.send(2);
		await ch.send(3);
		expect(await ch.receive()).toBe(1);
		expect(await ch.receive()).toBe(2);
		expect(await ch.receive()).toBe(3);
	});

	it("receive blocks if buffer empty", async () => {
		const ch = new Channel<number>(Infinity);
		let received: number | undefined;
		const recv = Promise.resolve(ch.receive()).then((v) => (received = v));
		await delay(10);
		expect(received).toBeUndefined();
		await ch.send(42);
		await recv;
		expect(received).toBe(42);
	});

	it("send/receive throw if closed", async () => {
		const ch = new Channel<number>(Infinity);
		ch.close();
		await expect(ch.send(1)).rejects.toThrow(ChannelClosedError);
		await expect(ch.receive()).rejects.toThrow(ChannelClosedError);
	});
});

describe("Channel (synchronous, 0 < capacity < Infinity)", () => {
	it("receive aborts with AbortSignal", async () => {
		const ch = new Channel<number>(2);
		const abort = new AbortController();
		const p = ch.receive(abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
	});
	it("send aborts with AbortSignal (buffer full)", async () => {
		const ch = new Channel<number>(1);
		await ch.send(1);
		const abort = new AbortController();
		const p = ch.send(2, abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
	});
	it("send fills buffer, then blocks", async () => {
		const ch = new Channel<number>(2);
		await ch.send(1);
		await ch.send(2);
		let sent = false;
		const send = ch.send(3).then(() => (sent = true));
		await delay(10);
		expect(sent).toBe(false);
		expect(await ch.receive()).toBe(1);
		await send;
		expect(sent).toBe(true);
	});

	it("receive drains buffer, then blocks", async () => {
		const ch = new Channel<number>(2);
		await ch.send(1);
		await ch.send(2);
		expect(await ch.receive()).toBe(1);
		expect(await ch.receive()).toBe(2);
		let received: number | undefined;
		const recv = Promise.resolve(ch.receive()).then((v) => (received = v));
		await delay(10);
		expect(received).toBeUndefined();
		await ch.send(99);
		await recv;
		expect(received).toBe(99);
	});

	it("send/receive throw if closed", async () => {
		const ch = new Channel<number>(2);
		ch.close();
		await expect(ch.send(1)).rejects.toThrow(ChannelClosedError);
		await expect(ch.receive()).rejects.toThrow(ChannelClosedError);
	});
});
