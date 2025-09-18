import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";
import { Timer } from "./timer.js";

suite("Timer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("should start and fire the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 10);

		expect(timer.isActive()).toBe(false);

		timer.start();

		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(10);
		vi.runAllTicks();
		expect(callback).toHaveBeenCalledOnce();
		expect(timer.isActive()).toBe(false);
	});

	test("should not start the timer if already active", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(20);
		vi.runAllTicks();

		timer.start();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(30);
		vi.runAllTicks();

		expect(callback).toHaveBeenCalledOnce();
		expect(timer.isActive()).toBe(false);
	});

	test("should restart the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(20);
		vi.runAllTicks();

		timer.restart();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(30);
		vi.runAllTicks();
		expect(callback).not.toHaveBeenCalled();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(40);
		vi.runAllTicks();
		expect(callback).toHaveBeenCalledOnce();
		expect(timer.isActive()).toBe(false);
	});

	test("should cancel the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		vi.advanceTimersByTime(20);
		vi.runAllTicks();

		timer.cancel();
		expect(timer.isActive()).toBe(false);

		vi.advanceTimersByTime(30);
		vi.runAllTicks();
		expect(callback).not.toHaveBeenCalled();
		expect(timer.isActive()).toBe(false);
	});

	test("should throw unhandled exception if the callback throws", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockImplementation(() => {
			throw error;
		});
		const timer = new Timer(callback, 10);

		const uncaughtExceptionHandler = vi.fn();
		process.once("uncaughtException", uncaughtExceptionHandler);

		timer.start();

		vi.advanceTimersByTime(10);
		vi.runAllTicks();
		expect(callback).toHaveBeenCalledOnce();

		await vi.waitFor(() => {
			expect(uncaughtExceptionHandler).toHaveBeenCalledOnce();
		});

		expect(uncaughtExceptionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});

	test("should throw unhandled rejection if the callback returns a rejected promise", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockRejectedValue(error);
		const timer = new Timer(callback, 10);

		const unhandledRejectionHandler = vi.fn();
		process.once("unhandledRejection", unhandledRejectionHandler);

		timer.start();

		vi.advanceTimersByTime(10);
		vi.runAllTicks();
		expect(callback).toHaveBeenCalledOnce();

		await vi.waitFor(() => {
			expect(unhandledRejectionHandler).toHaveBeenCalledOnce();
		});

		expect(unhandledRejectionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});
});
