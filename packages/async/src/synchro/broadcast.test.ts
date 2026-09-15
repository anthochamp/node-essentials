import { describe, expect, it } from "vitest";

import { Broadcast, BroadcastSubscriberLaggedError } from "./broadcast.js";
import { ChannelClosedError } from "./channel.js";

describe("Broadcast", () => {
	it("delivers falsy messages", async () => {
		const bc = new Broadcast<number | string | boolean | null>(8);
		const sub = bc.subscribe();

		bc.send(0);
		bc.send("");
		bc.send(false);
		bc.send(null);

		expect(await sub.receive()).toBe(0);
		expect(await sub.receive()).toBe("");
		expect(await sub.receive()).toBe(false);
		expect(await sub.receive()).toBeNull();
	});

	it("delivers messages to all subscribers", async () => {
		const bc = new Broadcast<string>(4);
		const sub1 = bc.subscribe();
		const sub2 = bc.subscribe();

		bc.send("A");
		bc.send("B");

		expect(await sub1.receive()).toBe("A");
		expect(await sub1.receive()).toBe("B");
		expect(await sub2.receive()).toBe("A");
		expect(await sub2.receive()).toBe("B");
	});

	it("does not deliver messages sent before subscription", async () => {
		const bc = new Broadcast<string>(4);
		bc.send("A");
		const sub = bc.subscribe();
		bc.send("B");
		expect(await sub.receive()).toBe("B");
	});

	it("throws on receive after close", async () => {
		const bc = new Broadcast<string>(4);
		const sub = bc.subscribe();
		bc.close();
		await expect(sub.receive()).rejects.toThrow(ChannelClosedError);
	});

	it("throws on send after close", async () => {
		const bc = new Broadcast<string>(4);
		bc.close();
		expect(() => bc.send("A")).toThrow(ChannelClosedError);
	});

	it("throws BroadcastSubscriberLaggedError if subscriber lags", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		bc.send("A");
		bc.send("B");
		bc.send("C"); // "A" is dropped for sub
		await expect(sub.receive()).rejects.toThrow(BroadcastSubscriberLaggedError);
		expect(await sub.receive()).toBe("B");
		expect(await sub.receive()).toBe("C");
	});

	it("delivers messages in order", async () => {
		const bc = new Broadcast<number>(3);
		const sub = bc.subscribe();
		bc.send(1);
		bc.send(2);
		bc.send(3);
		expect(await sub.receive()).toBe(1);
		expect(await sub.receive()).toBe(2);
		expect(await sub.receive()).toBe(3);
	});

	it("subscriber closed returns closed true and throws on receive", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		sub.close();
		expect(sub.closed).toBe(true);
		await expect(sub.receive()).rejects.toThrow(ChannelClosedError);
	});

	it("unsubscribes on close and does not receive further messages", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		bc.send("A");
		sub.close();
		bc.send("B");
		await expect(sub.receive()).rejects.toThrow(ChannelClosedError);
	});

	it("handles multiple subscribers with different receive rates", async () => {
		const bc = new Broadcast<number>(2);
		const sub1 = bc.subscribe();
		const sub2 = bc.subscribe();
		bc.send(1);
		bc.send(2);
		bc.send(3); // sub1 and sub2 both lag
		await expect(sub1.receive()).rejects.toThrow(
			BroadcastSubscriberLaggedError,
		);
		expect(await sub1.receive()).toBe(2);
		expect(await sub1.receive()).toBe(3);
		await expect(sub2.receive()).rejects.toThrow(
			BroadcastSubscriberLaggedError,
		);
		expect(await sub2.receive()).toBe(2);
		expect(await sub2.receive()).toBe(3);
	});

	it("supports aborting receive with AbortSignal", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		const controller = new AbortController();
		const promise = sub.receive(controller.signal);
		controller.abort();
		await expect(promise).rejects.toThrow();
	});

	it("does not throw lag error if no messages were dropped", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		bc.send("A");
		expect(await sub.receive()).toBe("A");
		bc.send("B");
		expect(await sub.receive()).toBe("B");
	});

	it("continues receiving correct messages after lag error", async () => {
		const bc = new Broadcast<string>(2);
		const sub = bc.subscribe();
		bc.send("A");
		bc.send("B");
		bc.send("C"); // "A" is dropped
		await expect(sub.receive()).rejects.toThrow(BroadcastSubscriberLaggedError);
		expect(await sub.receive()).toBe("B");
		expect(await sub.receive()).toBe("C");
		bc.send("D");
		expect(await sub.receive()).toBe("D");
	});

	it("sets closed on subscribers when channel is closed", async () => {
		const bc = new Broadcast<string>(2);
		const sub1 = bc.subscribe();
		const sub2 = bc.subscribe();
		expect(sub1.closed).toBe(false);
		expect(sub2.closed).toBe(false);
		bc.close();
		expect(sub1.closed).toBe(true);
		expect(sub2.closed).toBe(true);
		await expect(sub1.receive()).rejects.toThrow(ChannelClosedError);
		await expect(sub2.receive()).rejects.toThrow(ChannelClosedError);
	});
});
