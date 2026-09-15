import { describe, expect, it } from "vitest";

import { parseCron } from "./parser.js";
import { printCron } from "./printer.js";

describe("printCron", () => {
	it("round-trips a canonical expression", () => {
		const source = "0,30 9-17 * * 1-5";
		expect(printCron(parseCron(source))).toBe(source);
	});

	it("normalizes an equivalent day-of-week alias", () => {
		expect(printCron(parseCron("0 0 * * 7"))).toBe("0 0 * * 0");
	});

	it("normalizes names to numbers", () => {
		expect(printCron(parseCron("0 0 1 JAN MON"))).toBe("0 0 1 1 1");
	});

	it("prints a stepped wildcard", () => {
		expect(printCron(parseCron("*/10 * * * *"))).toBe("*/10 * * * *");
	});
});
