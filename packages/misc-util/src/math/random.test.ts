import {
	afterAll,
	beforeAll,
	expect,
	type MockInstance,
	suite,
	test,
	vi,
} from "vitest";
import { random, randomInt } from "./random.js";

suite("random", () => {
	let mathRandomSpy: MockInstance<typeof Math.random>;

	beforeAll(() => {
		// Mock Math.random to make tests predictable
		mathRandomSpy = vi.spyOn(Math, "random");
	});

	afterAll(() => {
		mathRandomSpy.mockRestore();
	});

	suite("random", () => {
		test("should return a value within the specified range", () => {
			mathRandomSpy.mockReturnValue(0); // Lowest possible value
			expect(random(10, 20)).toBe(10);

			mathRandomSpy.mockReturnValue(0.99999); // Highest possible value
			expect(random(10, 20)).toBeCloseTo(19.9999, 4);
		});

		test("should return different values on subsequent calls", () => {
			mathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
			const value1 = random(10, 20);
			const value2 = random(10, 20);
			expect(value1).not.toBe(value2);
		});
	});

	suite("randomInt", () => {
		test("should return an integer within the specified range", () => {
			mathRandomSpy.mockReturnValue(0); // Lowest possible value
			expect(randomInt(10, 20)).toBe(10);

			mathRandomSpy.mockReturnValue(0.99999); // Highest possible value
			expect(randomInt(10, 20)).toBe(19);
		});

		test("should return different integers on subsequent calls", () => {
			mathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
			const value1 = randomInt(10, 20);
			const value2 = randomInt(10, 20);
			expect(value1).not.toBe(value2);
		});
	});
});
