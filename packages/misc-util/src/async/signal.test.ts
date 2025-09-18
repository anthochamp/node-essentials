import { expect, suite, test } from "vitest";
import { Signal } from "./signal.js";

suite("Signalable", () => {
	test("should initialize with the correct state", () => {
		const signalable1 = new Signal();
		expect(signalable1.signaled).toBe(false);

		const signalable2 = new Signal(false, false);
		expect(signalable2.signaled).toBe(false);

		const signalable3 = new Signal(false, true);
		expect(signalable3.signaled).toBe(true);
	});

	test("should signal and reset the signalable", () => {
		const signalable = new Signal();
		expect(signalable.signaled).toBe(false);

		signalable.signal();
		expect(signalable.signaled).toBe(true);

		signalable.reset();
		expect(signalable.signaled).toBe(false);
	});

	test("should wait for the signalable", async () => {
		const signalable = new Signal();

		const waitPromises = Promise.all([signalable.wait(), signalable.wait()]);

		signalable.signal();

		await waitPromises;
	});

	test("should wait for an already signaled signalable", async () => {
		const signalable = new Signal(false, true);

		await signalable.wait();
	});

	test("should timeout when waiting for the signalable", async () => {
		const signalable = new Signal();
		await expect(() =>
			signalable.wait(AbortSignal.timeout(10)),
		).rejects.toThrow();
	});

	test("should not wait when the signalable is already signaled", async () => {
		const signalable = new Signal();

		let signaledCount = 0;
		const waitPromise1 = (async () => {
			await signalable.wait();
			signaledCount++;
		})();

		const waitPromise2 = (async () => {
			await signalable.wait();
			signaledCount++;
		})();

		expect(signaledCount).toBe(0);
		signalable.signal();
		await waitPromise1;
		await waitPromise2;
		expect(signaledCount).toBe(2);
	});

	test("should auto-reset the signalable", async () => {
		const signalable = new Signal(true);

		let signalCount = 0;
		const waitPromise1 = (async () => {
			await signalable.wait();
			signalCount++;
		})();

		const waitPromise2 = (async () => {
			await signalable.wait();
			signalCount++;
		})();

		expect(signalCount).toBe(0);
		signalable.signal();
		await waitPromise1;
		expect(signalCount).toBe(1);
		signalable.signal();
		await waitPromise2;
		expect(signalCount).toBe(2);
	});
});
