import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { noThrow, noThrowAsync } from "./no-throw.js";

describe("noThrow", () => {
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

	describe("noThrow", () => {
		it("should execute the callback without errors", () => {
			const callback = vi.fn();

			const wrapped = noThrow(callback);
			wrapped();

			expect(callback).toHaveBeenCalled();
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		it("should return undefined if the callback throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const wrapped = noThrow(callback);
			const result = wrapped();

			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalled();
			});

			expect(result).toBeUndefined();
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalled();
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		it("should pass thisArg and args to the callback", () => {
			const callback = vi.fn(function (
				this: { value: number },
				a: number,
				b: number,
			) {
				return this.value + a + b;
			});

			const thisArg = { value: 10 };
			const args: [number, number] = [5, 7];

			const wrapped = noThrow(callback);
			const result = wrapped.apply(thisArg, args);

			expect(result).toBe(22);
			expect(callback).toHaveBeenCalledWith(...args);
			expect(callback.mock.contexts[0]).toBe(thisArg);

			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});
	});

	describe("noThrowAsync", () => {
		it("should execute the async callback without errors", async () => {
			const callback = vi.fn().mockResolvedValue(undefined);

			const wrapped = noThrowAsync(callback);
			await wrapped();

			expect(callback).toHaveBeenCalled();
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		it("should return undefined if the callback throws", async () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error("Test error");
			});

			const wrapped = noThrowAsync(callback);
			const result = await wrapped();

			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalled();
			});

			expect(result).toBeUndefined();
			await vi.waitFor(() => {
				expect(uncaughtExceptionHandler).toHaveBeenCalled();
			});
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});

		it("should return undefined if the async callback throws", async () => {
			const callback = vi.fn().mockRejectedValue(new Error("Test error"));

			const wrapped = noThrowAsync(callback);
			const result = await wrapped();

			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalled();
			});

			expect(result).toBeUndefined();
			await vi.waitFor(() => {
				expect(unhandledRejectionHandler).toHaveBeenCalled();
			});
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
		});

		it("should pass thisArg and args to the async callback", async () => {
			const callback = vi.fn(async function (
				this: { value: number },
				a: number,
				b: number,
			) {
				return this.value + a + b;
			});

			const thisArg = { value: 10 };
			const args: [number, number] = [5, 7];

			const wrapped = noThrowAsync(callback);
			const result = await wrapped.apply(thisArg, args);

			expect(result).toBe(22);
			expect(callback).toHaveBeenCalledWith(...args);
			expect(callback.mock.contexts[0]).toBe(thisArg);
			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
			expect(unhandledRejectionHandler).not.toHaveBeenCalled();
		});
	});
});
