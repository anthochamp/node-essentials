/**
 * Splits `bytes` into consecutive views of at most `size` bytes each — the
 * inverse of {@link concatBytes}. Each returned array is a `subarray` (no copy),
 * so mutating one mutates `bytes` itself.
 */
export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
	const chunks: Uint8Array[] = [];

	for (let offset = 0; offset < bytes.length; offset += size) {
		chunks.push(bytes.subarray(offset, offset + size));
	}

	return chunks;
}
