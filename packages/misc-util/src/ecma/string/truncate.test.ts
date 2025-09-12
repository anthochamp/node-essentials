import { describe, expect, it } from "vitest";
import { truncate } from "./truncate.js";

describe("truncate", () => {
	it("should return the original string if it's shorter than maxLength", () => {
		expect(truncate("Hello, World!", 20)).toBe("Hello, World!");
	});

	it("should truncate and add ellipsis at the end by default", () => {
		expect(truncate("Hello, World!", 10)).toBe("Hello, Wo…");
	});

	it("should truncate and add ellipsis at the start", () => {
		expect(truncate("Hello, World!", 10, { position: "start" })).toBe(
			"…o, World!",
		);
	});

	it("should truncate and add ellipsis in the middle", () => {
		expect(truncate("Hello, World!", 10, { position: "middle" })).toBe(
			"Hello…rld!",
		);
	});

	it("should respect wordCutting option when false", () => {
		expect(
			truncate("Hello, beautiful World!", 15, {
				position: "end",
				wordCutting: false,
			}),
		).toBe("Hello,…");

		expect(
			truncate("Hello, beautiful World!", 15, {
				position: "start",
				wordCutting: false,
			}),
		).toBe("…World!");

		expect(
			truncate("Hello, beautiful World!", 15, {
				position: "middle",
				wordCutting: false,
			}),
		).toBe("Hello,…World!");
	});

	it("should use custom ellipsis string", () => {
		expect(truncate("Hello, World!", 10, { ellipsisString: "[...]" })).toBe(
			"Hello[...]",
		);
	});

	it("should handle maxLength less than or equal to ellipsis string length when strictLength is false", () => {
		expect(
			truncate("Hello, World!", 1, {
				ellipsisString: "...",
				strictLength: false,
			}),
		).toBe("...");
		expect(
			truncate("Hello, World!", 2, {
				ellipsisString: "...",
				strictLength: false,
			}),
		).toBe("...");
		expect(
			truncate("Hello, World!", 3, {
				ellipsisString: "...",
				strictLength: false,
			}),
		).toBe("...");
		expect(
			truncate("Hello, World!", 4, {
				ellipsisString: "...",
				strictLength: false,
			}),
		).toBe("H...");
	});

	it("should handle maxLength less than or equal to ellipsis string length when strictLength is true", () => {
		expect(truncate("Hello, World!", 1, { ellipsisString: "..." })).toBe("");
		expect(truncate("Hello, World!", 2, { ellipsisString: "..." })).toBe("");
		expect(truncate("Hello, World!", 3, { ellipsisString: "..." })).toBe("...");
		expect(truncate("Hello, World!", 4, { ellipsisString: "..." })).toBe(
			"H...",
		);
	});

	it("should handle empty string input", () => {
		expect(truncate("", 5)).toBe("");
	});

	it("should handle an empty ellipsis", () => {
		expect(truncate("Hello, World!", 5, { ellipsisString: "" })).toBe("Hello");
	});

	it("should handle an empty ellipsis with wordCutting false", () => {
		expect(
			truncate("Hello my dear World!", 9, {
				ellipsisString: "",
				wordCutting: false,
			}),
		).toBe("Hello my");
	});

	it("should handle long word with wordCutting false and no ellipsis", () => {
		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "",
				wordCutting: false,
				position: "end",
			}),
		).toBe("Supercalif");

		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "",
				wordCutting: false,
				position: "start",
			}),
		).toBe("alidocious");

		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "",
				wordCutting: false,
				position: "middle",
			}),
		).toBe("Supercious");
	});

	it("should handle long word with wordCutting false and an ellipsis", () => {
		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "...",
				wordCutting: false,
				position: "end",
			}),
		).toBe("Superca...");

		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "...",
				wordCutting: false,
				position: "start",
			}),
		).toBe("...docious");

		expect(
			truncate("Supercalifragilisticexpialidocious", 10, {
				ellipsisString: "...",
				wordCutting: false,
				position: "middle",
			}),
		).toBe("Supe...ous");
	});
});
