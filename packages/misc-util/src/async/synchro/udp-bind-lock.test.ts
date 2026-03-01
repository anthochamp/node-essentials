import { beforeEach, describe, expect, it } from "vitest";
import { UdpBindLock } from "./udp-bind-lock.js";

const TEST_PORT = 54321;
const TEST_ADDR = "127.0.0.1";

describe("UdpBindLock", () => {
	let lock: UdpBindLock;

	beforeEach(() => {
		lock = new UdpBindLock({
			udpSocketType: "udp4",
			udpBindPort: TEST_PORT,
			udpBindAddress: TEST_ADDR,
		});
	});

	it("should acquire and release lock", async () => {
		await lock.lock();
		expect(lock.locked).toBe(true);
		await lock.unlock();
		expect(lock.locked).toBe(false);
	});

	it("should not acquire lock if already acquired", async () => {
		const lock1 = new UdpBindLock({
			udpSocketType: "udp4",
			udpBindPort: TEST_PORT,
			udpBindAddress: TEST_ADDR,
		});
		const lock2 = new UdpBindLock({
			udpSocketType: "udp4",
			udpBindPort: TEST_PORT,
			udpBindAddress: TEST_ADDR,
		});
		await lock1.lock();
		await expect(lock2.lock(AbortSignal.timeout(100))).rejects.toThrow();
		await lock1.unlock();
	});

	it("should throw if release called without acquire", async () => {
		await expect(lock.unlock()).rejects.toThrow("Lock is not acquired");
	});

	it("should allow re-acquire after release", async () => {
		await lock.lock();
		expect(lock.locked).toBe(true);
		await lock.unlock();
		expect(lock.locked).toBe(false);

		await lock.lock();
		expect(lock.locked).toBe(true);
		await lock.unlock();
		expect(lock.locked).toBe(false);
	});
});
