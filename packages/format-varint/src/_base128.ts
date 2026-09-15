/** Set on every byte but the last of a sequence. */
export const CONTINUATION_BIT = 0x80;

/** The seven payload bits each byte carries. */
export const PAYLOAD_MASK = 0x7f;

/** The radix: seven payload bits per byte. */
export const RADIX = 128;

/** Seven payload bits, as a shift distance for the `bigint` forms. */
export const PAYLOAD_BITS = 7n;

/** {@link PAYLOAD_MASK} for the `bigint` forms. */
export const PAYLOAD_MASK_BIG = 0x7fn;

/** {@link RADIX} for the `bigint` forms. */
export const RADIX_BIG = 128n;

/**
 * The largest value that can still be shifted left by seven bits and stay
 * exactly representable: `value * 128 + 127` is `Number.MAX_SAFE_INTEGER` when
 * `value` is this, so the check is exact rather than conservative.
 */
export const MAX_SAFE_PREFIX = Math.floor(Number.MAX_SAFE_INTEGER / RADIX);
