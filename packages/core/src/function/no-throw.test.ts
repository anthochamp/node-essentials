/// <reference types="node" />

import {
	afterEach,
	beforeEach,
	expect,
	type Mock,
	suite,
	test,
	vi,
} from "vitest";

import {
	catchOutOfBand,
	catchOutOfBandApply,
	catchOutOfBandApplyAsync,
	catchOutOfBandAsync,
} from "./no-throw.js";

suite("catchOutOfBand family", () => {
	let uncaughtExceptionHandler: Mock<() => void>;
	let unhandledRejectionHandler: Mock<() => void>;

	beforeEach(() => {
		uncaughtExceptionHandler = vi.fn();
		unhandledRejectionHandler = vi.fn();
		process.on("uncaughtException", uncaughtExceptionHandler);
		process.on("unhandledRejection", unhandledRejectionHandler);
	});

	afterEach(() => {
		process.off("uncaughtException", uncaughtExceptionHandler);
		process.off("unhandledRejection", unhandledRejectionHandler);
	});

	suite("catchOutOfBandApply", () => {
		test("should call the function and return its result", () => {
			const callback = vi.fn().mockReturnValue(42);

			const result = catchOutOfBandApply(callback, [1, 2]);

			expect(result).toBe(42);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(1, 2);
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the function throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = catchOutOfBandApply(callback, []);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalledTimes(1);
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});
	});

	suite("catchOutOfBandApplyAsync", () => {
		test("should call the function and return its result", async () => {
			const callback = vi.fn().mockResolvedValue(42);

			const result = await catchOutOfBandApplyAsync(callback, [1, 2]);

			expect(result).toBe(42);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(1, 2);
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the function throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = await catchOutOfBandApplyAsync(callback, []);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalledTimes(1);
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the function rejects", async () => {
			const callback = vi.fn().mockRejectedValue(new Error("Test error"));

			const result = await catchOutOfBandApplyAsync(callback, []);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(unhandledRejectionHandler).toHaveBeenCalledTimes(1);
			});
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
		});
	});

	suite("catchOutOfBand", () => {
		test("should call the function and return its result", () => {
			const callback = vi.fn().mockReturnValue(42);

			const result = catchOutOfBand(callback);

			expect(result).toBe(42);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the callback throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = catchOutOfBand(callback);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalledTimes(1);
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});
	});

	suite("catchOutOfBandAsync", () => {
		test("should call the function and return its result", async () => {
			const callback = vi.fn().mockResolvedValue(42);

			const result = await catchOutOfBandAsync(callback);

			expect(result).toBe(42);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the callback throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = await catchOutOfBandAsync(callback);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalledTimes(1);
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		test("should return undefined if the callback rejects", async () => {
			const callback = vi.fn().mockRejectedValue(new Error("Test error"));

			const result = await catchOutOfBandAsync(callback);

			expect(result).toBeUndefined();
			expect(callback).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => {
				expect(unhandledRejectionHandler).toHaveBeenCalledTimes(1);
			});
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
		});
	});
});
