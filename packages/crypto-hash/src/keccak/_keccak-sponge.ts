import { getBigUint64Le } from "@ac-kit/core";

import { keccakF1600 } from "./_keccak-f1600.js";
import type { KeccakParameters } from "./_keccak-params.js";

/**
 * XORs one `rateWords`-lane block starting at `offset` into `state` and
 * permutes, in place — the sponge's absorbing step for a single full block.
 *
 * The reusable primitive both {@link keccakSponge} (one-shot) and an incremental
 * hasher (one block per call, as they accumulate across `write()`s) are built
 * from.
 *
 * @param rateWords The sponge's rate, in 64-bit words (`rateBytes / 8`).
 */
export function keccakAbsorbBlock(
	state: BigUint64Array,
	block: Uint8Array,
	offset: number,
	rateWords: number,
): void {
	for (let word = 0; word < rateWords; word++) {
		state[word] = state[word]! ^ getBigUint64Le(block, offset + word * 8);
	}

	keccakF1600(state);
}

/**
 * Squeezes `outputBytes` out of `state`, permuting between blocks as needed —
 * the sponge's squeezing step, shared by the one-shot and incremental paths
 * alike since it only ever runs once, after every input block (including the
 * final, padded one) has already been absorbed.
 */
export function keccakSqueeze(
	state: BigUint64Array,
	rateBytes: number,
	outputBytes: number,
): Uint8Array<ArrayBuffer> {
	const rateWords = rateBytes / 8;
	const output = new Uint8Array(outputBytes);
	let written = 0;

	while (written < outputBytes) {
		for (let word = 0; word < rateWords && written < outputBytes; word++) {
			let lane = state[word]!;

			for (let byte = 0; byte < 8 && written < outputBytes; byte++) {
				output[written++] = Number(lane & 0xffn);
				lane >>= 8n;
			}
		}

		if (written < outputBytes) {
			keccakF1600(state);
		}
	}

	return output;
}

/**
 * The Keccak sponge construction (FIPS 202 §4): absorb `data` (with pad10*1
 * padding and a domain-separation suffix) into a 1600-bit state, then squeeze
 * `outputBytes` out of it — permuting between blocks on both sides as needed.
 *
 * Unlike the SHA-1/SHA-2 (Merkle–Damgård) family, `rate` here is a per-
 * algorithm parameter, not a fixed block size — it's what makes one
 * construction serve fixed-output SHA3-224/256/384/512 and variable-output
 * SHAKE128/256 alike, differing only in `params` and `outputBytes`. Every named
 * one-shot function (`sha3_224`, `shake128`, …) is a thin wrapper around this,
 * configured by a {@link KeccakParameters} preset.
 */
export function keccakSponge(
	data: Uint8Array,
	params: KeccakParameters,
	outputBytes: number,
): Uint8Array<ArrayBuffer> {
	const { rateBytes, domainSuffix } = params;
	const state = new BigUint64Array(25);
	const paddedLength = Math.ceil((data.length + 1) / rateBytes) * rateBytes;
	const padded = new Uint8Array(paddedLength);

	padded.set(data);
	padded[data.length] = domainSuffix;
	padded[paddedLength - 1] = padded[paddedLength - 1]! ^ 0x80;

	const rateWords = rateBytes / 8;

	for (let offset = 0; offset < padded.length; offset += rateBytes) {
		keccakAbsorbBlock(state, padded, offset, rateWords);
	}

	return keccakSqueeze(state, rateBytes, outputBytes);
}
