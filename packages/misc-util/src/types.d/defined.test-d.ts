import { assertType, describe, it } from "vitest";
import type { Defined } from "./defined.js";

describe("Defined", () => {
	it("should make a type defined", () => {
		type A = string | null | undefined;
		type B = Defined<A>;
		const a: B = "test";
		assertType<string | null>(a);
	});
});
