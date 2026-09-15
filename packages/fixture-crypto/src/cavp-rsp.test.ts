import { describe, expect, it } from "vitest";

import {
	parseCavpDigestRsp,
	parseCavpXofRsp,
	parseCavpXofVariableOutputRsp,
} from "./cavp-rsp.js";

describe("parseCavpDigestRsp", () => {
	const content = `#  CAVS 11.0
#  "SHA-256 ShortMsg" information

[L = 32]

Len = 0
Msg = 00
MD = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

Len = 8
Msg = d3
MD = 28969cdfa74a12c82f3bad960b0b000aca2ac329deea5c2328ebc6f2ba9802c1
`;

	it("truncates the Len=0 placeholder message to 0 bytes", () => {
		const [first] = parseCavpDigestRsp(content);

		expect(first?.lengthBits).toBe(0);
		expect(first?.message).toHaveLength(0);
	});

	it("parses the message and digest hex for a non-empty case", () => {
		const [, second] = parseCavpDigestRsp(content);

		expect(second?.lengthBits).toBe(8);
		expect(second?.message).toEqual(new Uint8Array([0xd3]));
		expect(second?.digest).toHaveLength(32);
	});

	it("parses both cases from a two-case file", () => {
		expect(parseCavpDigestRsp(content)).toHaveLength(2);
	});
});

describe("parseCavpXofRsp", () => {
	const content = `#  CAVS 19.0
#  "SHAKE128 ShortMsg" information

[Outputlen = 128]

Len = 0
Msg = 00
Output = 7f9c2ba4e88f827d616045507605853e
`;

	it("parses the Output field the same shape as a digest case", () => {
		const [first] = parseCavpXofRsp(content);

		expect(first?.lengthBits).toBe(0);
		expect(first?.message).toHaveLength(0);
		expect(first?.digest).toHaveLength(16);
	});
});

describe("parseCavpXofVariableOutputRsp", () => {
	const content = `#  CAVS 19.0
#  "SHAKE128 VariableOut" information

[Tested for Output of byte-oriented messages]
[Input Length = 128]

COUNT = 0
Outputlen = 128
Msg = 84e950051876050dc851fbd99e6247b8
Output = 8599bd89f63a848c49ca593ec37a12c6

COUNT = 1
Outputlen = 16
Msg = 9a335790abf769877c9e6cd3d5199e8c
Output = 2e
`;

	it("parses the message and output for each case", () => {
		const cases = parseCavpXofVariableOutputRsp(content);

		expect(cases).toHaveLength(2);
		expect(cases[0]?.outputLengthBits).toBe(128);
		expect(cases[0]?.output).toHaveLength(16);
	});

	it("supports a different output length per case", () => {
		const cases = parseCavpXofVariableOutputRsp(content);

		expect(cases[1]?.outputLengthBits).toBe(16);
		expect(cases[1]?.output).toEqual(new Uint8Array([0x2e]));
	});
});
