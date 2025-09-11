import { describe, expect, it, vi } from "vitest";
import { PeriodicalTimer } from "./periodical-timer.js";
import { sleep } from "./sleep.js";

const MARGIN_MS = 10;
const INTERVAL_MS = 20;

describe("PeriodicalTimer", () => {
	it("should start and stop the timer correctly", async () => {
		const callback = vi.fn();
		const timer = new PeriodicalTimer(callback, INTERVAL_MS);

		expect(timer.isStarted()).toBe(false);

		timer.start();
		expect(timer.isStarted()).toBe(true);

		await sleep(INTERVAL_MS * 2 + MARGIN_MS);
		expect(callback).toHaveBeenCalledTimes(2);

		timer.stop();
		expect(timer.isStarted()).toBe(false);

		const finalTickCount = callback.mock.calls.length;
		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).toHaveBeenCalledTimes(finalTickCount);
	});

	it("should call the callback immediately if tickOnStart is true", async () => {
		const callback = vi.fn();
		const timer = new PeriodicalTimer(callback, INTERVAL_MS, {
			tickOnStart: true,
		});

		timer.start();
		expect(callback).toHaveBeenCalledOnce();

		await sleep(INTERVAL_MS * 2 + MARGIN_MS);
		expect(callback).toHaveBeenCalledTimes(3);

		timer.stop();
	});

	it("should not call the callback if stopped before the first tick", async () => {
		const callback = vi.fn();
		const timer = new PeriodicalTimer(callback, INTERVAL_MS);

		timer.start();
		timer.stop();

		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).not.toHaveBeenCalled();
	});

	it("should wait for the callback to complete if waitForCompletion is true", async () => {
		const callback = vi.fn().mockImplementation(async () => {
			await sleep(INTERVAL_MS * 2); // must be at least INTERVAL_MS*2
		});
		const timer = new PeriodicalTimer(callback, INTERVAL_MS, {
			waitForCompletion: true,
		});

		timer.start();

		await sleep(INTERVAL_MS * 2 + MARGIN_MS);
		expect(callback).toHaveBeenCalledTimes(1);

		timer.stop();
	});

	it("should handle callback rejections asynchronously if waitForCompletion is false", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockRejectedValue(error);
		const timer = new PeriodicalTimer(callback, INTERVAL_MS);

		const unhandledRejectionHandler = vi.fn();
		process.once("unhandledRejection", unhandledRejectionHandler);

		timer.start();

		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).toHaveBeenCalledOnce();

		timer.stop();

		await vi.waitFor(() => {
			expect(unhandledRejectionHandler).toHaveBeenCalledOnce();
		});

		expect(unhandledRejectionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});

	it("should handle callback exception asynchronously if waitForCompletion is false", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockImplementation(() => {
			throw error;
		});
		const timer = new PeriodicalTimer(callback, INTERVAL_MS);

		const uncaughtExceptionHandler = vi.fn();
		process.once("uncaughtException", uncaughtExceptionHandler);

		timer.start();

		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).toHaveBeenCalledOnce();

		timer.stop();

		await vi.waitFor(() => {
			expect(uncaughtExceptionHandler).toHaveBeenCalledOnce();
		});

		expect(uncaughtExceptionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});

	it("should handle callback rejections asynchronously if waitForCompletion is true", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockRejectedValue(error);
		const timer = new PeriodicalTimer(callback, INTERVAL_MS, {
			waitForCompletion: true,
		});

		const unhandledRejectionHandler = vi.fn();
		process.once("unhandledRejection", unhandledRejectionHandler);

		timer.start();

		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).toHaveBeenCalledOnce();

		timer.stop();

		await vi.waitFor(() => {
			expect(unhandledRejectionHandler).toHaveBeenCalledOnce();
		});

		expect(unhandledRejectionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});

	it("should handle callback exception asynchronously if waitForCompletion is true", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockImplementation(() => {
			throw error;
		});
		const timer = new PeriodicalTimer(callback, INTERVAL_MS, {
			waitForCompletion: true,
		});

		const uncaughtExceptionHandler = vi.fn();
		process.once("uncaughtException", uncaughtExceptionHandler);

		timer.start();

		await sleep(INTERVAL_MS + MARGIN_MS);
		expect(callback).toHaveBeenCalledOnce();

		timer.stop();

		await vi.waitFor(() => {
			expect(uncaughtExceptionHandler).toHaveBeenCalledOnce();
		});

		expect(uncaughtExceptionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});
});
