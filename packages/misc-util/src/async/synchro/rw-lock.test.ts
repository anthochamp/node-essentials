import { describe, expect, it } from "vitest";
import { RwLock } from "./rw-lock.js";

describe("RwLock", () => {
	describe("basic lock/unlock", () => {
		it("should allow a single reader to acquire and release the lock", async () => {
			const lock = new RwLock();
			await lock.readLock();
			await lock.readUnlock();
			// Should not throw
		});

		it("should allow a single writer to acquire and release the lock", async () => {
			const lock = new RwLock();
			await lock.writeLock();
			await lock.writeUnlock();
			// Should not throw
		});

		it("should not allow write lock while read lock is held", async () => {
			const lock = new RwLock();
			await lock.readLock();
			let acquired = false;
			const writer = lock.writeLock().then(() => {
				acquired = true;
			});
			// Give event loop a chance
			await Promise.resolve();
			expect(acquired).toBe(false);
			await lock.readUnlock();
			await writer;
			expect(acquired).toBe(true);
			await lock.writeUnlock();
		});

		it("should not allow read lock while write lock is held", async () => {
			const lock = new RwLock();
			await lock.writeLock();
			let acquired = false;
			const reader = lock.readLock().then(() => {
				acquired = true;
			});
			// Give event loop a chance
			await Promise.resolve();
			expect(acquired).toBe(false);
			await lock.writeUnlock();
			await reader;
			expect(acquired).toBe(true);
			await lock.readUnlock();
		});

		it("should allow multiple readers concurrently", async () => {
			const lock = new RwLock();
			await lock.readLock();
			let reader2Acquired = false;
			let reader2CanRelease: (() => void) | undefined;
			const reader2Ready = new Promise<void>((resolve) => {
				reader2CanRelease = resolve;
			});

			async function acquireReader2() {
				await lock.readLock();
				reader2Acquired = true;
				await reader2Ready;
				await lock.readUnlock();
			}
			const reader2 = acquireReader2();

			for (let i = 0; i < 10 && !reader2Acquired; i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			expect(reader2Acquired).toBe(true);
			await lock.readUnlock();
			reader2CanRelease?.();
			await reader2;
		});
	});

	describe("tryReadLock and tryWriteLock", () => {
		it("should acquire read lock if no writer or waiting writer", () => {
			const lock = new RwLock();
			expect(lock.tryReadLock()).toBe(true);
		});

		it("should not acquire read lock if write lock is held", async () => {
			const lock = new RwLock();
			await lock.writeLock();
			expect(lock.tryReadLock()).toBe(false);
			await lock.writeUnlock();
		});

		it("should acquire write lock if no readers or writers", () => {
			const lock = new RwLock();
			expect(lock.tryWriteLock()).toBe(true);
		});

		it("should not acquire write lock if read lock is held", async () => {
			const lock = new RwLock();
			await lock.readLock();
			expect(lock.tryWriteLock()).toBe(false);
			await lock.readUnlock();
		});

		it("should not acquire write lock if write lock is held", async () => {
			const lock = new RwLock();
			await lock.writeLock();
			expect(lock.tryWriteLock()).toBe(false);
			await lock.writeUnlock();
		});

		it("should not acquire read lock if writer is waiting", async () => {
			const lock = new RwLock();
			await lock.readLock();
			// Start a writer (will wait)
			const writerPromise = lock.writeLock();
			// Give event loop a chance for writer to increment writersWaiting
			await Promise.resolve();
			expect(lock.tryReadLock()).toBe(false);
			await lock.readUnlock();
			await writerPromise;
			await lock.writeUnlock();
		});
	});

	describe("read/write upgrade/downgrade", () => {
		it("should upgrade read lock to write lock when no other readers", async () => {
			const lock = new RwLock();
			await lock.readLock();
			await lock.readToWriteLock();
			// Now holds write lock
			await lock.writeUnlock();
		});

		it("should wait to upgrade read lock to write lock if other readers exist", async () => {
			const lock = new RwLock();
			await lock.readLock();
			await lock.readLock(); // second reader
			let upgraded = false;
			async function doUpgrade() {
				await lock.readToWriteLock();
				upgraded = true;
				await lock.writeUnlock();
			}
			const upgradePromise = doUpgrade();
			// Give event loop a chance
			await Promise.resolve();
			expect(upgraded).toBe(false);
			await lock.readUnlock(); // release one reader
			// Now upgrade can proceed
			await upgradePromise;
			expect(upgraded).toBe(true);
		});

		it("should throw if upgrading without holding a read lock", async () => {
			const lock = new RwLock();
			await expect(lock.readToWriteLock()).rejects.toThrow();
		});

		it("should downgrade write lock to read lock", async () => {
			const lock = new RwLock();
			await lock.writeLock();
			await lock.writeToReadLock();
			// Now holds read lock
			await lock.readUnlock();
		});

		it("should throw if downgrading without holding a write lock", async () => {
			const lock = new RwLock();
			await expect(lock.writeToReadLock()).rejects.toThrow();
		});
	});

	describe("error cases and edge conditions", () => {
		it("should throw LockNotAcquiredError when unlocking read lock not held", async () => {
			const lock = new RwLock();
			await expect(lock.readUnlock()).rejects.toThrow();
		});

		it("should throw LockNotAcquiredError when unlocking write lock not held", async () => {
			const lock = new RwLock();
			await expect(lock.writeUnlock()).rejects.toThrow();
		});

		it("should throw LockNotAcquiredError when upgrading without read lock", async () => {
			const lock = new RwLock();
			await expect(lock.readToWriteLock()).rejects.toThrow();
		});

		it("should throw LockNotAcquiredError when downgrading without write lock", async () => {
			const lock = new RwLock();
			await expect(lock.writeToReadLock()).rejects.toThrow();
		});

		it("should abort readLock if signal is aborted", async () => {
			const lock = new RwLock();
			const controller = new AbortController();
			controller.abort();
			await expect(lock.readLock(controller.signal)).rejects.toThrow();
		});

		it("should abort writeLock if signal is aborted", async () => {
			const lock = new RwLock();
			const controller = new AbortController();
			try {
				controller.abort();
			} catch {}
			await expect(lock.writeLock(controller.signal)).rejects.toThrow();
		});

		it("should abort readToWriteLock if signal is aborted while waiting", async () => {
			const lock = new RwLock();
			await lock.readLock();
			await lock.readLock(); // second reader
			const controller = new AbortController();
			let error: unknown;
			async function tryUpgrade() {
				try {
					await lock.readToWriteLock(controller.signal);
				} catch (e) {
					error = e;
				}
			}
			const upgradePromise = tryUpgrade();
			// Give event loop a chance for upgrade to block
			await Promise.resolve();
			try {
				controller.abort();
			} catch {}
			await upgradePromise;
			expect(error).toBeDefined();
			await lock.readUnlock();
			await lock.readUnlock();
		});
	});

	describe("concurrency and fairness", () => {
		it("should allow multiple readers to proceed concurrently", async () => {
			const lock = new RwLock();
			let r1Acquired = false;
			let r2Acquired = false;
			let r1CanRelease: (() => void) | undefined;
			let r2CanRelease: (() => void) | undefined;
			const r1Ready = new Promise<void>((resolve) => {
				r1CanRelease = resolve;
			});
			const r2Ready = new Promise<void>((resolve) => {
				r2CanRelease = resolve;
			});

			async function reader1() {
				await lock.readLock();
				r1Acquired = true;
				await r1Ready;
				await lock.readUnlock();
			}
			async function reader2() {
				await lock.readLock();
				r2Acquired = true;
				await r2Ready;
				await lock.readUnlock();
			}
			const p1 = reader1();
			const p2 = reader2();
			// Wait for both to acquire
			for (let i = 0; i < 10 && (!r1Acquired || !r2Acquired); i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			expect(r1Acquired).toBe(true);
			expect(r2Acquired).toBe(true);
			r1CanRelease?.();
			r2CanRelease?.();
			await Promise.all([p1, p2]);
		});

		it("should allow only one writer at a time", async () => {
			const lock = new RwLock();
			let w1Acquired = false;
			let w2Acquired = false;
			let w1CanRelease: (() => void) | undefined;
			const w1Ready = new Promise<void>((resolve) => {
				w1CanRelease = resolve;
			});

			async function writer1() {
				await lock.writeLock();
				w1Acquired = true;
				await w1Ready;
				await lock.writeUnlock();
			}
			async function writer2() {
				await lock.writeLock();
				w2Acquired = true;
				await lock.writeUnlock();
			}
			const p1 = writer1();
			// Wait for w1 to acquire
			for (let i = 0; i < 10 && !w1Acquired; i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			expect(w1Acquired).toBe(true);
			const p2 = writer2();
			// Give event loop a chance
			await Promise.resolve();
			expect(w2Acquired).toBe(false);
			w1CanRelease?.();
			await p1;
			// Now w2 can acquire
			for (let i = 0; i < 10 && !w2Acquired; i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			expect(w2Acquired).toBe(true);
			await p2;
		});

		it("should grant locks in FIFO order (writer after readers)", async () => {
			const lock = new RwLock();
			let r1Acquired = false;
			let r2Acquired = false;
			let wAcquired = false;
			let r1CanRelease: (() => void) | undefined;
			let r2CanRelease: (() => void) | undefined;
			const r1Ready = new Promise<void>((resolve) => {
				r1CanRelease = resolve;
			});
			const r2Ready = new Promise<void>((resolve) => {
				r2CanRelease = resolve;
			});

			async function reader1() {
				await lock.readLock();
				r1Acquired = true;
				await r1Ready;
				await lock.readUnlock();
			}
			async function reader2() {
				await lock.readLock();
				r2Acquired = true;
				await r2Ready;
				await lock.readUnlock();
			}
			async function writer() {
				await lock.writeLock();
				wAcquired = true;
				await lock.writeUnlock();
			}
			const p1 = reader1();
			const p2 = reader2();
			// Wait for both readers to acquire
			for (let i = 0; i < 10 && (!r1Acquired || !r2Acquired); i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			const pw = writer();
			// Writer should not acquire until both readers release
			await Promise.resolve();
			expect(wAcquired).toBe(false);
			r1CanRelease?.();
			r2CanRelease?.();
			await Promise.all([p1, p2]);
			// Now writer can acquire
			for (let i = 0; i < 10 && !wAcquired; i++) {
				await new Promise((r) => setTimeout(r, 1));
			}
			expect(wAcquired).toBe(true);
			await pw;
		});
	});
});
