import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Broadcast } from "@ac-kit/async";

const BROADCAST_MESSAGES = 2_000;
const SUBSCRIBERS = 4;
const WANTED = BROADCAST_MESSAGES * SUBSCRIBERS;

durationCondition("Fan-out — 2 000 messages to 4 subscribers", () => {
	durationCase("@ac-kit/.Broadcast", { tags: { kind: "js" } }, async () => {
		const broadcast = new Broadcast<number>(BROADCAST_MESSAGES);
		let counter = 0;

		const subscriptions = Array.from({ length: SUBSCRIBERS }, () =>
			broadcast.subscribe(),
		);

		const consumers = subscriptions.map(async (subscription) => {
			for (let index = 0; index < BROADCAST_MESSAGES; index++) {
				await subscription.receive();
				counter++;
			}
		});

		for (let index = 0; index < BROADCAST_MESSAGES; index++) {
			broadcast.send(index);
		}
		await Promise.all(consumers);
		broadcast.close();
		assert.strictEqual(counter, WANTED);
	});
});
