import { describe, expect, it } from "vitest";
import { Condition } from "./condition.js";
import { Mutex } from "./mutex.js";

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Condition", () => {
	it("wait resolves after signal", async () => {
		const mutex = new Mutex();
		const cond = new Condition();
		let ready = false;

		async function waiter() {
			await mutex.lock();
			while (!ready) {
				await cond.wait(mutex);
			}
			mutex.unlock();
			return true;
		}

		const waiterPromise = waiter();
		await delay(10); // ensure waiter is waiting
		await mutex.lock();
		ready = true;
		await cond.signal();
		mutex.unlock();
		expect(await waiterPromise).toBe(true);
	});

	it("broadcast wakes all waiters", async () => {
		const mutex = new Mutex();
		const cond = new Condition();
		let ready = false;
		let woken = 0;

		async function waiter() {
			await mutex.lock();
			while (!ready) {
				await cond.wait(mutex);
			}
			woken++;
			mutex.unlock();
		}

		const promises = [waiter(), waiter(), waiter()];
		await delay(10);
		await mutex.lock();
		ready = true;
		await cond.broadcast();
		mutex.unlock();
		await Promise.all(promises);
		expect(woken).toBe(3);
	});

	it("wait can be aborted", async () => {
		const mutex = new Mutex();
		const cond = new Condition();
		await mutex.lock();
		const abort = new AbortController();
		const p = cond.wait(mutex, abort.signal);
		abort.abort();
		await expect(p).rejects.toThrow();
		mutex.unlock();
	});
});
