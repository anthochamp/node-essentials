import { expect, suite, test, vi } from "vitest";

import { VoidEvent } from "./void-event.js";

suite("VoidEvent", () => {
	test("notifies subscribers with no arguments on emit", () => {
		const event = new VoidEvent();
		const listener = vi.fn();

		event.subscribe(listener);
		event.emit();

		expect(listener).toHaveBeenCalledWith();
	});

	test("resolves a wait() call on emit", async () => {
		const event = new VoidEvent();
		const waitPromise = event.wait();

		event.emit();

		await expect(waitPromise).resolves.toEqual([]);
	});
});
