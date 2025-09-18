import { expect, suite, test, vi } from "vitest";
import { traverseError } from "./traverse-error.js";

suite("traverseError", () => {
	test("should traverse a simple error", () => {
		const error = new Error("Simple error");

		const callback = vi.fn();
		traverseError(error, callback);

		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith(error, null, null);
	});

	test("should traverse nested causes", () => {
		const errorC = new Error("Error C");
		const errorB = new Error("Error B", { cause: errorC });
		const errorA = new Error("Error A", { cause: errorB });

		const callback = vi.fn();
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(2, errorB, errorA, "cause");
		expect(callback).toHaveBeenNthCalledWith(3, errorC, errorB, "cause");
	});

	test("should respect traverseCauses option", () => {
		const errorC = new Error("Error C");
		const errorB = new Error("Error B", { cause: errorC });
		const errorA = new Error("Error A", { cause: errorB });

		const callback = vi.fn();
		traverseError(errorA, callback, { traverseCauses: false });

		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith(errorA, null, null);
	});

	test("should traverse AggregateErrors", () => {
		const errorC1 = new Error("Error C1");
		const errorC2 = new Error("Error C2");
		const aggregateErrorB = new AggregateError(
			[errorC1, errorC2],
			"Aggregate B",
		);
		const errorA = new Error("Error A", { cause: aggregateErrorB });

		const callback = vi.fn();
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledTimes(4);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(
			2,
			aggregateErrorB,
			errorA,
			"cause",
		);
		expect(callback).toHaveBeenNthCalledWith(
			3,
			errorC1,
			aggregateErrorB,
			"aggregate",
		);
		expect(callback).toHaveBeenNthCalledWith(
			4,
			errorC2,
			aggregateErrorB,
			"aggregate",
		);
	});

	test("should respect includeAggregateErrors option", () => {
		const errorC1 = new Error("Error C1");
		const errorC2 = new Error("Error C2");
		const aggregateErrorB = new AggregateError(
			[errorC1, errorC2],
			"Aggregate B",
		);
		const errorA = new Error("Error A", { cause: aggregateErrorB });

		const callback = vi.fn();
		traverseError(errorA, callback, { traverseAggregateErrors: false });

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(
			2,
			aggregateErrorB,
			errorA,
			"cause",
		);
	});

	test("should traverse both causes and AggregateErrors (in order)", () => {
		const errorE = new Error("Error E");
		const errorD1 = new Error("Error D1", { cause: errorE });
		const errorD2 = new Error("Error D2");
		const errorC = new Error("Error C");
		const aggregateErrorB = new AggregateError(
			[errorD1, errorD2],
			"Aggregate B",
			{ cause: errorC },
		);
		const errorA = new Error("Error A", { cause: aggregateErrorB });

		const callback = vi.fn();
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledTimes(6);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(
			2,
			aggregateErrorB,
			errorA,
			"cause",
		);
		expect(callback).toHaveBeenNthCalledWith(
			3,
			errorD1,
			aggregateErrorB,
			"aggregate",
		);
		expect(callback).toHaveBeenNthCalledWith(4, errorE, errorD1, "cause");
		expect(callback).toHaveBeenNthCalledWith(
			5,
			errorD2,
			aggregateErrorB,
			"aggregate",
		);
		expect(callback).toHaveBeenNthCalledWith(
			6,
			errorC,
			aggregateErrorB,
			"cause",
		);
	});

	test("should avoid cycles", () => {
		const errorA = new Error("Error A");
		errorA.cause = errorA; // Create a cycle

		const callback = vi.fn();
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith(errorA, null, null);
	});

	test("should stop traversal when callback returns false in cause", () => {
		const errorC = new Error("Error C");
		const errorB = new Error("Error B", { cause: errorC });
		const errorA = new Error("Error A", { cause: errorB });

		const callback = vi.fn((current) => {
			if (current === errorB) {
				return false; // Stop traversal
			}
		});
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(2, errorB, errorA, "cause");
	});

	test("should stop traversal when callback returns false in aggregate", () => {
		const errorC1 = new Error("Error C1");
		const errorC2 = new Error("Error C2");
		const aggregateErrorB = new AggregateError(
			[errorC1, errorC2],
			"Aggregate B",
		);
		const errorA = new Error("Error A", { cause: aggregateErrorB });

		const callback = vi.fn((current) => {
			if (current === errorC1) {
				return false; // Stop traversal
			}
		});
		traverseError(errorA, callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, errorA, null, null);
		expect(callback).toHaveBeenNthCalledWith(
			2,
			aggregateErrorB,
			errorA,
			"cause",
		);
		expect(callback).toHaveBeenNthCalledWith(
			3,
			errorC1,
			aggregateErrorB,
			"aggregate",
		);
	});
});
