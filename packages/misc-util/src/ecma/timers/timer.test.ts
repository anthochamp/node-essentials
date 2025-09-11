import { describe, expect, it, vi } from "vitest";
import { sleep } from "./sleep.js";
import { Timer } from "./timer.js";

describe("Timer", () => {
	it("should start and fire the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 10);

		expect(timer.isActive()).toBe(false);

		timer.start();

		expect(timer.isActive()).toBe(true);

		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledOnce();
		});
		expect(timer.isActive()).toBe(false);
	});

	it("should not start the timer if already active", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		await sleep(20);

		timer.start();
		expect(timer.isActive()).toBe(true);

		await sleep(30);

		expect(callback).toHaveBeenCalledOnce();
		expect(timer.isActive()).toBe(false);
	});

	it("should restart the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		await sleep(20);

		timer.restart();
		expect(timer.isActive()).toBe(true);

		await sleep(30);
		expect(callback).not.toHaveBeenCalled();
		expect(timer.isActive()).toBe(true);

		await sleep(40);
		expect(callback).toHaveBeenCalledOnce();
		expect(timer.isActive()).toBe(false);
	});

	it("should cancel the timer", async () => {
		const callback = vi.fn();
		const timer = new Timer(callback, 40);

		timer.start();
		expect(timer.isActive()).toBe(true);

		await sleep(20);

		timer.cancel();
		expect(timer.isActive()).toBe(false);

		await sleep(30);
		expect(callback).not.toHaveBeenCalled();
		expect(timer.isActive()).toBe(false);
	});

	it("should throw unhandled exception if the callback throws", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockImplementation(() => {
			throw error;
		});
		const timer = new Timer(callback, 10);

		const uncaughtExceptionHandler = vi.fn();
		process.once("uncaughtException", uncaughtExceptionHandler);

		timer.start();

		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledOnce();
		});

		await vi.waitFor(() => {
			expect(uncaughtExceptionHandler).toHaveBeenCalledOnce();
		});

		expect(uncaughtExceptionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});

	it("should throw unhandled rejection if the callback returns a rejected promise", async () => {
		const error = new Error("Test error");
		const callback = vi.fn().mockRejectedValue(error);
		const timer = new Timer(callback, 10);

		const unhandledRejectionHandler = vi.fn();
		process.once("unhandledRejection", unhandledRejectionHandler);

		timer.start();

		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledOnce();
		});

		await vi.waitFor(() => {
			expect(unhandledRejectionHandler).toHaveBeenCalledOnce();
		});

		expect(unhandledRejectionHandler).toHaveBeenCalledWith(
			error,
			expect.anything(),
		);
	});
});
