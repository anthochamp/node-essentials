import { bytesForBits } from "@ac-kit/core";

/** Parses a NIST CAVP `.rsp` byte-oriented SHAVS/SHA-3 vector file into cases. */
export interface CavpDigestCase {
	readonly lengthBits: number;
	readonly message: Uint8Array;
	readonly digest: Uint8Array;
}

/**
 * A `ShortMsg`/`LongMsg`-shaped `.rsp`: `Len = N` / `Msg = <hex>` / `<key> =
 * <hex>` triples, differing only in the result field's key (`MD` for a fixed-
 * output digest, `Output` for a XOF). `Len = 0`'s `Msg = 00` is CAVP's fixed
 * placeholder for an empty message, not one real byte — the message for that
 * case is truncated to 0 bytes, per the byte count implied by `Len`, not the
 * placeholder's own length.
 */
function parseLenMsgResultRsp(
	content: string,
	resultKey: string,
): CavpDigestCase[] {
	const cases: CavpDigestCase[] = [];
	const resultPrefix = `${resultKey} = `;
	let pendingLengthBits: number | null = null;
	let pendingMessage: Uint8Array | null = null;

	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();

		if (line.startsWith("Len = ")) {
			pendingLengthBits = Number.parseInt(line.slice("Len = ".length), 10);
		} else if (line.startsWith("Msg = ") && pendingLengthBits !== null) {
			const hex = line.slice("Msg = ".length);

			pendingMessage = Uint8Array.fromHex(hex).subarray(
				0,
				bytesForBits(pendingLengthBits),
			);
		} else if (
			line.startsWith(resultPrefix) &&
			pendingLengthBits !== null &&
			pendingMessage !== null
		) {
			cases.push({
				lengthBits: pendingLengthBits,
				message: pendingMessage,
				digest: Uint8Array.fromHex(line.slice(resultPrefix.length)),
			});
			pendingLengthBits = null;
			pendingMessage = null;
		}
	}

	return cases;
}

/** Parses a fixed-output digest `ShortMsg`/`LongMsg` `.rsp` file (`MD = `). */
export function parseCavpDigestRsp(content: string): CavpDigestCase[] {
	return parseLenMsgResultRsp(content, "MD");
}

/**
 * Parses a XOF's `ShortMsg`/`LongMsg` `.rsp` file (`Output = `, fixed output
 * length declared once per file rather than per case).
 */
export function parseCavpXofRsp(content: string): CavpDigestCase[] {
	return parseLenMsgResultRsp(content, "Output");
}

/**
 * One case of a XOF's `VariableOut` `.rsp` file: a fixed message, a chosen
 * output length in bits.
 */
export interface CavpXofVariableOutputCase {
	readonly outputLengthBits: number;
	readonly message: Uint8Array;
	readonly output: Uint8Array;
}

/**
 * Parses the `VariableOut` `.rsp` format: repeated `COUNT = N` / `Outputlen =
 * <bits>` / `Msg = <hex>` / `Output = <hex>` quadruples — the message length is
 * fixed per file (declared in a header this parser doesn't need), and what
 * varies per case is the requested output length.
 */
export function parseCavpXofVariableOutputRsp(
	content: string,
): CavpXofVariableOutputCase[] {
	const cases: CavpXofVariableOutputCase[] = [];
	let pendingOutputLengthBits: number | null = null;
	let pendingMessage: Uint8Array | null = null;

	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();

		if (line.startsWith("Outputlen = ")) {
			pendingOutputLengthBits = Number.parseInt(
				line.slice("Outputlen = ".length),
				10,
			);
		} else if (line.startsWith("Msg = ")) {
			pendingMessage = Uint8Array.fromHex(line.slice("Msg = ".length));
		} else if (
			line.startsWith("Output = ") &&
			pendingOutputLengthBits !== null &&
			pendingMessage !== null
		) {
			cases.push({
				outputLengthBits: pendingOutputLengthBits,
				message: pendingMessage,
				output: Uint8Array.fromHex(line.slice("Output = ".length)),
			});
		}
	}

	return cases;
}
