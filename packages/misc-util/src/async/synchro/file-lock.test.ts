import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FileLock } from "./file-lock.js";
import { LockNotAcquiredError } from "./ilock.js";

let TEST_DIR: string;
let TEST_FILE: string;

describe("FileLock", () => {
	beforeEach(async () => {
		TEST_DIR = await fs.promises.mkdtemp(
			path.join(os.tmpdir(), "filelock-test-"),
		);
		TEST_FILE = path.join(TEST_DIR, "lockfile");
		if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
	});

	it("should acquire and release a lock", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.lock();
		expect(lock.locked).toBe(true);
		await lock.unlock();
		expect(lock.locked).toBe(false);
	});

	it("should not acquire lock if already locked", async () => {
		const lock1 = new FileLock(TEST_FILE);
		const lock2 = new FileLock(TEST_FILE);
		await lock1.lock();
		await expect(lock2.lock(AbortSignal.timeout(100))).rejects.toThrow();
		await lock1.unlock();
	});

	it("should allow reacquire after release", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.lock();
		await lock.unlock();
		await lock.lock();
		await lock.unlock();
	});

	it("should clean up lock file on release", async () => {
		const lock = new FileLock(TEST_FILE);
		await lock.lock();
		await lock.unlock();
		expect(fs.existsSync(TEST_FILE)).toBe(false);
	});

	it("should throw if release is called without acquire", async () => {
		const lock = new FileLock(TEST_FILE);
		await expect(lock.unlock()).rejects.toThrow(LockNotAcquiredError);
	});
});
