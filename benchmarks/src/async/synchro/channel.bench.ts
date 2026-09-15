import assert from "node:assert";
import { PassThrough } from "node:stream";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Channel } from "@ac-kit/async";

const MESSAGES = 5_000;
const BUFFERED_CAPACITY = 1_024;
const WANTED = (MESSAGES * (MESSAGES - 1)) / 2;

durationCondition(
	"Channel — 5 000 messages, one producer to one consumer",
	() => {
		durationCase(
			"@ac-kit/.Channel (rendezvous)",
			{ tags: { kind: "js", capacity: "0" } },
			async () => {
				const channel = new Channel<number>(0);
				let sum = 0;
				const consumer = (async () => {
					for (let index = 0; index < MESSAGES; index++) {
						sum += await channel.receive();
					}
				})();
				for (let index = 0; index < MESSAGES; index++) {
					await channel.send(index);
				}
				await consumer;
				channel.close();
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"@ac-kit/.Channel (buffered)",
			{ tags: { kind: "js", capacity: String(BUFFERED_CAPACITY) } },
			async () => {
				const channel = new Channel<number>(BUFFERED_CAPACITY);
				let sum = 0;
				const consumer = (async () => {
					for (let index = 0; index < MESSAGES; index++) {
						sum += await channel.receive();
					}
				})();
				for (let index = 0; index < MESSAGES; index++) {
					await channel.send(index);
				}
				await consumer;
				channel.close();
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"stream.PassThrough (object mode)",
			{ tags: { kind: "native", capacity: String(BUFFERED_CAPACITY) } },
			async () => {
				const stream = new PassThrough({
					objectMode: true,
					highWaterMark: BUFFERED_CAPACITY,
				});
				let sum = 0;
				const consumer = (async () => {
					for await (const value of stream) {
						sum += value;
					}
				})();
				for (let index = 0; index < MESSAGES; index++) {
					if (!stream.write(index)) {
						await new Promise((resolve) => stream.once("drain", resolve));
					}
				}
				stream.end();
				await consumer;
				assert.strictEqual(sum, WANTED);
			},
		);
		durationCase(
			"array plus resolver queue",
			{ tags: { kind: "native", capacity: "unbounded" } },
			async () => {
				const queue: number[] = [];
				const waiters: ((value: number) => void)[] = [];
				let sum = 0;
				const consumer = (async () => {
					for (let index = 0; index < MESSAGES; index++) {
						const value = queue.shift();
						sum +=
							value ??
							(await new Promise<number>((resolve) => waiters.push(resolve)));
					}
				})();
				for (let index = 0; index < MESSAGES; index++) {
					const waiter = waiters.shift();
					if (waiter) {
						waiter(index);
					} else {
						queue.push(index);
					}
				}
				await consumer;
				assert.strictEqual(sum, WANTED);
			},
		);
	},
);
