/** XOR-shift a `bigint` value by a given `shift` amount. */
export function xorshift64(value: bigint, shift: bigint): bigint {
	return value ^ (value >> shift);
}
