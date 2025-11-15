import { describe, expect, it, vi } from "vitest";
import { LockableBase } from "./lockable-base.js";

class DummyLockable extends LockableBase {
	locked = false;
	acquire = vi.fn(async () => {
		this.locked = true;
		return () => {
			this.locked = false;
		};
	});
	release = vi.fn(async () => {
		this.locked = false;
	});
}

describe("LockableBase", () => {
	it("withLock should acquire, run callback, and release", async () => {
		const lockable = new DummyLockable();
		const callback = vi.fn(async () => "result");
		const result = await lockable.withLock(callback);
		expect(result).toBe("result");
		expect(lockable.acquire).toHaveBeenCalled();
		expect(callback).toHaveBeenCalled();
		// locked should be false after release
		expect(lockable.locked).toBe(false);
	});

	it("withLock should release even if callback throws", async () => {
		const lockable = new DummyLockable();
		const error = new Error("fail");
		const callback = vi.fn(async () => {
			throw error;
		});
		await expect(lockable.withLock(callback)).rejects.toThrow(error);
		// locked should be false after release
		expect(lockable.locked).toBe(false);
	});

	it("withLock should pass signal to acquire", async () => {
		const lockable = new DummyLockable();
		const controller = new AbortController();
		await lockable.withLock(async () => "ok", controller.signal);
		expect(lockable.acquire).toHaveBeenCalledWith(controller.signal);
	});
});
