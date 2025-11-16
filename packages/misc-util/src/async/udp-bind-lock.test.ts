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
		const release = await lock.acquire();
		expect(lock.locked).toBe(true);
		await release();
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
		await lock1.acquire();
		await expect(lock2.acquire(AbortSignal.timeout(100))).rejects.toThrow();
		await lock1.release();
	});

	it("should throw if release called without acquire", async () => {
		await expect(lock.release()).rejects.toThrow("Lock is not acquired");
	});

	it("should allow re-acquire after release", async () => {
		const release1 = await lock.acquire();
		expect(lock.locked).toBe(true);
		await release1();
		expect(lock.locked).toBe(false);

		const release2 = await lock.acquire();
		expect(lock.locked).toBe(true);
		await release2();
		expect(lock.locked).toBe(false);
	});
});
