import { setBigUint64Be, setBigUint64Le } from "@ac-kit/core";

/**
 * Merkle–Damgård padding (RFC 1321 §3.1 / FIPS 180-4 §5.1): append a single
 * `0x80` marker byte, zero-pad to leave room for a trailing bit-length field,
 * then write that field via `writeLength` — the one axis every member of this
 * family varies on, since some (SHA-1/SHA-2/SM3) write it big-endian and others
 * (MD5/RIPEMD-160) little-endian, matching each algorithm's own message-word
 * endianness throughout.
 */
function pad(
	data: Uint8Array,
	blockSizeBytes: number,
	lengthFieldBytes: number,
	writeLength: (
		target: Uint8Array<ArrayBuffer>,
		offset: number,
		value: bigint,
	) => void,
	messageBitLength: bigint = BigInt(data.length) * 8n,
): Uint8Array<ArrayBuffer> {
	const headerBytes = data.length + 1; // the message plus the 0x80 marker
	const paddedLength =
		Math.ceil((headerBytes + lengthFieldBytes) / blockSizeBytes) *
		blockSizeBytes;
	const padded = new Uint8Array(paddedLength);

	padded.set(data);
	padded[data.length] = 0x80;

	// The length field's high bytes are 0 for any input that fits in memory at
	// all — no real message reaches 2^64 bits long, so only the low 8 bytes of
	// a wider (e.g. SHA-512's 16-byte) field are ever set; the value is always
	// written as the buffer's *last* 8 bytes, regardless of the field's total
	// width, since the reserved high-order bytes stay zero either way.
	writeLength(padded, paddedLength - 8, messageBitLength);

	return padded;
}

/**
 * Big-endian length field — used by SHA-1/SHA-2/SM3.
 *
 * @param messageBitLength The bit length written into the trailing length
 *   field. Defaults to `data`'s own length — the one-shot case, where `data` is
 *   the whole message. An incremental hasher passes the _running_ total across
 *   every `write()` so far instead, since `data` there is only the final,
 *   sub-block-sized tail, not the whole message.
 */
export function merkleDamgardPad(
	data: Uint8Array,
	blockSizeBytes: number,
	lengthFieldBytes: number,
	messageBitLength?: bigint,
): Uint8Array<ArrayBuffer> {
	return pad(
		data,
		blockSizeBytes,
		lengthFieldBytes,
		setBigUint64Be,
		messageBitLength,
	);
}

/**
 * Little-endian length field — used by MD5/RIPEMD-160, which both read/write
 * their message words little-endian throughout, unlike every other
 * Merkle–Damgård member in this package.
 *
 * @param messageBitLength See `merkleDamgardPad`'s doc.
 */
export function merkleDamgardPadLe(
	data: Uint8Array,
	blockSizeBytes: number,
	lengthFieldBytes: number,
	messageBitLength?: bigint,
): Uint8Array<ArrayBuffer> {
	return pad(
		data,
		blockSizeBytes,
		lengthFieldBytes,
		setBigUint64Le,
		messageBitLength,
	);
}
