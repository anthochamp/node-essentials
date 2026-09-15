import { expect, suite, test } from "vitest";

import { stripDiacritics } from "./strip-diacritics.js";

suite("stripDiacritics", () => {
	test("should strip diacritics from accented letters", () => {
		expect(stripDiacritics("àáâäãåā")).toBe("aaaaaaa");
		expect(stripDiacritics("çćčĉċ")).toBe("ccccc");
		expect(stripDiacritics("èéêëēėę")).toBe("eeeeeee");
		expect(stripDiacritics("ĝğġģ")).toBe("gggg");
		expect(stripDiacritics("ĥ")).toBe("h");
		expect(stripDiacritics("ìíîïīįı")).toBe("iiiiiiı");
		expect(stripDiacritics("ĵ")).toBe("j");
		expect(stripDiacritics("ķ")).toBe("k");
		expect(stripDiacritics("ĺļľ")).toBe("lll");
		expect(stripDiacritics("ñńňņ")).toBe("nnnn");
		expect(stripDiacritics("òóôöōőŏ")).toBe("ooooooo");
		expect(stripDiacritics("ŕřŗ")).toBe("rrr");
		expect(stripDiacritics("śšşŝș")).toBe("sssss");
		expect(stripDiacritics("ťţț")).toBe("ttt");
		expect(stripDiacritics("ùúûüūůűŭũų")).toBe("uuuuuuuuuu");
		expect(stripDiacritics("ŵ")).toBe("w");
		expect(stripDiacritics("ýÿŷ")).toBe("yyy");
		expect(stripDiacritics("žżź")).toBe("zzz");
		expect(stripDiacritics("ÀÁÂÄÃÅĀ")).toBe("AAAAAAA");
		expect(stripDiacritics("Café à la mode.")).toBe("Cafe a la mode.");
	});

	test("should leave plain ASCII text unchanged", () => {
		expect(stripDiacritics("Hello, World!")).toBe("Hello, World!");
	});

	test("should leave ligatures and special letters with no decomposition unchanged", () => {
		expect(stripDiacritics("æ")).toBe("æ");
		expect(stripDiacritics("Æ")).toBe("Æ");
		expect(stripDiacritics("œ")).toBe("œ");
		expect(stripDiacritics("Œ")).toBe("Œ");
		expect(stripDiacritics("øØ")).toBe("øØ");
		expect(stripDiacritics("đĐð")).toBe("đĐð");
		expect(stripDiacritics("łŁ")).toBe("łŁ");
	});
});
