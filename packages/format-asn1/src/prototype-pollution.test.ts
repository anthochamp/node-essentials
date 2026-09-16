import { afterEach, describe, expect, it } from "vitest";

import { berDecode, berEncode } from "./ber.js";
import { cerDecode, cerEncode } from "./cer.js";
import { derDecode, derEncode } from "./der.js";
import { ref } from "./schema/types/base.js";
import { component } from "./schema/types/constructed/component.js";
import { sequence } from "./schema/types/constructed/sequence.js";
import { integer } from "./schema/types/primitives/integer.js";
import { utf8String } from "./schema/types/strings/utf8-string.js";

type Polluted = { polluted?: unknown };

afterEach(() => {
	delete (Object.prototype as Polluted).polluted;
});

// A schema whose component names are keys that reach a shared prototype.
const Hostile = ref(
	sequence([
		component("__proto__", utf8String()),
		component("constructor", integer()),
	] as const),
);

const value = { ["__proto__"]: "polluted", constructor: 1n };

describe("ASN.1 prototype pollution", () => {
	for (const [name, encode, decode] of [
		["BER", berEncode, berDecode],
		["CER", cerEncode, cerDecode],
		["DER", derEncode, derDecode],
	] as const) {
		it(`should keep a __proto__ component as an own entry (${name})`, () => {
			const decoded = decode(Hostile, encode(Hostile, value)) as Record<
				string,
				unknown
			>;

			expect(({} as Polluted).polluted).toBeUndefined();
			expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
			expect(decoded["__proto__"]).toBe("polluted");
			expect(decoded["constructor"]).toBe(1n);
		});
	}
});
