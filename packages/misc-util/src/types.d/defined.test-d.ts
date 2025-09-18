import { assertType, suite, test } from "vitest";
import type { Defined } from "./defined.js";

suite("Defined", () => {
	test("should make a type defined", () => {
		type A = string | null | undefined;
		type B = Defined<A>;
		const a: B = "test";
		assertType<string | null>(a);
	});
});
