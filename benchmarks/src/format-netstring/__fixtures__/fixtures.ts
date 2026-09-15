import { chunkBytes } from "@ac-kit/core";

const CHUNK_SIZE = 1400; // Roughly one TCP segment.

export const NETSTRING_FRAMES = 5_000;
export const NETSTRING_PAYLOAD = 256;

export const decodeContext = {
	timedOut: false,
	atEof: false,
	atMessageBoundary: false,
};

export function netstringTraffic(
	frames: number,
	payloadSize: number,
): Uint8Array[] {
	const parts: Buffer[] = [];
	const payload = Buffer.alloc(payloadSize, 0x61);
	for (let i = 0; i < frames; i++) {
		parts.push(
			Buffer.from(`${payloadSize}:`, "ascii"),
			payload,
			Buffer.from(","),
		);
	}
	return chunkBytes(Buffer.concat(parts), CHUNK_SIZE);
}
