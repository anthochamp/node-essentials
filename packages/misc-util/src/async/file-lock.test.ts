import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FileLock } from "./file-lock.js";
import { LockNotAcquiredError } from "./ilockable.js";

let TEST_DIR: string;
let TEST_FILE: string;

describe("FileLock", () => {
	beforeEach(() => {
		TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "filelock-test-"));
		TEST_FILE = path.join(TEST_DIR, "lockfile");
		if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
	});

	it("should acquire and release a lock", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.acquire();
		expect(lock.locked).toBe(true);
		await lock.release();
		expect(lock.locked).toBe(false);
	});

	it("should not acquire lock if already locked", async () => {
		const lock1 = new FileLock(TEST_FILE);
		const lock2 = new FileLock(TEST_FILE);
		await lock1.acquire();
		await expect(lock2.acquire(AbortSignal.timeout(100))).rejects.toThrow();
		await lock1.release();
	});

	it.only("should allow reacquire after release", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.acquire();
		await lock.release();
		await lock.acquire();
		await lock.release();
	});

	it("should clean up lock file on release", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.acquire();
		await lock.release();
		expect(fs.existsSync(TEST_FILE)).toBe(false);
	});

	it("should throw if release is called without acquire", async () => {
		const lock = new FileLock(TEST_FILE);
		await expect(lock.release()).rejects.toThrow(LockNotAcquiredError);
	});
});
