//! Constant-time fixed-width unsigned integer arithmetic for WASM.
//!
//! This crate is the arithmetic layer beneath `@ac-kit/math-numbers`'s
//! `FixedUint` — a limb-array representation with no dynamic sizing, built for
//! RSA- and EC-scale modular arithmetic where the operands are secret.
//!
//! # Why this exists as WASM, not TypeScript
//!
//! JavaScript gives no constant-time execution guarantee at all — JIT tiering,
//! garbage collection pauses, and `BigInt` (variable-time by specification)
//! all leak timing on secret-dependent paths. This crate is compiled with a
//! fixed, predictable instruction sequence per operation; the WASM host still
//! does not *guarantee* constant time (a hostile JIT could still special-case
//! it), but it removes the two guaranteed leaks JS has and gives the property
//! something to be true of, which plain JS cannot.
//!
//! # The constant-time discipline
//!
//! Every function below that touches secret data follows one rule: **no
//! `if`/`match` whose condition depends on a limb value.** Where the algorithm
//! needs a choice — is this a borrow, is this bit of the exponent set, is the
//! candidate remainder still too large — the choice is made with a bitmask
//! (`ct_mask`) and applied with `ct_select`/`ct_swap`, so the same instructions
//! execute regardless of which way the choice goes. `opt-level` cannot break
//! this: LLVM reorders and eliminates the branches that exist in the source,
//! it does not add new ones conditioned on runtime values.
//!
//! # Word size and limits
//!
//! Limbs are `u64`, little-endian (limb 0 is least significant) — matching the
//! soft-float crate's convention and using WASM's native 64-bit integer
//! support (wasm32 restricts pointer width, not integer width).
//! [`MAX_LIMBS`] bounds the shared scratch buffers at 8192 bits, comfortably
//! covering RSA-8192 and every standard elliptic curve. Every exported
//! function additionally takes the *actual* word count `n` for the call, so a
//! 256-bit operand costs 4 words of work, not 128.
//!
//! # What is deliberately not here
//!
//! Modular inverse is not implemented in this crate. `a⁻¹ mod p` for prime `p`
//! is `a^(p-2) mod p` by Fermat's little theorem — the same constant-time
//! [`mod_exp`] this crate already provides, with an exponent computed from the
//! (public) modulus. That composition lives in the TypeScript kernel, where
//! `p - 2` is an ordinary `bigint` subtraction on public data; duplicating it
//! here would only add a second implementation of the same ladder to keep in
//! sync. A general odd-modulus inverse (Bernstein–Yang / safegcd) is not
//! implemented at all — it is a materially different and riskier algorithm to
//! get right without an existing reference, and nothing in the current plan
//! needs an inverse against a composite modulus.

const MAX_LIMBS: usize = 128;

// ---------------------------------------------------------------------------
// Constant-time primitives
// ---------------------------------------------------------------------------

/// All-ones if `condition`, all-zeros otherwise — the mask every
/// secret-dependent choice below is built from.
#[inline(always)]
fn ct_mask(condition: bool) -> u64 {
    0u64.wrapping_sub(condition as u64)
}

/// `if mask == all-ones { a } else { b }`, without branching on `mask`.
#[inline(always)]
fn ct_select_limb(mask: u64, a: u64, b: u64) -> u64 {
    b ^ (mask & (a ^ b))
}

/// `dst = if mask == all-ones { a } else { b }`, limb by limb, always
/// touching exactly `n` limbs regardless of `mask`.
fn ct_select(mask: u64, a: &[u64], b: &[u64], dst: &mut [u64], n: usize) {
    for i in 0..n {
        dst[i] = ct_select_limb(mask, a[i], b[i]);
    }
}

/// Swaps `a` and `b` in place when `mask` is all-ones, leaves them untouched
/// otherwise — the same instructions execute either way.
fn ct_swap(mask: u64, a: &mut [u64], b: &mut [u64], n: usize) {
    for i in 0..n {
        let t = mask & (a[i] ^ b[i]);
        a[i] ^= t;
        b[i] ^= t;
    }
}

/// `true` when every limb in `a[..n]` is zero, computed by ORing all of them
/// together rather than returning at the first non-zero limb — an early
/// return would make the running time depend on *where* the first set bit is.
fn ct_is_zero(a: &[u64], n: usize) -> bool {
    let mut acc = 0u64;

    for i in 0..n {
        acc |= a[i];
    }

    acc == 0
}

// ---------------------------------------------------------------------------
// Add, subtract, compare
// ---------------------------------------------------------------------------

/// `dst = a + b`, returning the carry out of the top limb. Always processes
/// exactly `n` limbs.
fn add_with_carry(a: &[u64], b: &[u64], dst: &mut [u64], n: usize) -> u64 {
    let mut carry = 0u64;

    for i in 0..n {
        let (sum1, carry1) = a[i].overflowing_add(b[i]);
        let (sum2, carry2) = sum1.overflowing_add(carry);

        dst[i] = sum2;
        carry = (carry1 as u64) | (carry2 as u64);
    }

    carry
}

/// `dst = a - b`, returning the borrow out of the top limb (`1` means `a < b`
/// and `dst` holds the wrapped two's-complement difference).
fn sub_with_borrow(a: &[u64], b: &[u64], dst: &mut [u64], n: usize) -> u64 {
    let mut borrow = 0u64;

    for i in 0..n {
        let (diff1, borrow1) = a[i].overflowing_sub(b[i]);
        let (diff2, borrow2) = diff1.overflowing_sub(borrow);

        dst[i] = diff2;
        borrow = (borrow1 as u64) | (borrow2 as u64);
    }

    borrow
}

/// Three-way comparison, computed from a subtraction rather than a
/// first-difference scan: a scan that returns as soon as two limbs differ
/// leaks the length of the common prefix through timing.
fn cmp_limbs(a: &[u64], b: &[u64], n: usize) -> i32 {
    let mut scratch = [0u64; MAX_LIMBS];
    let borrow = sub_with_borrow(a, b, &mut scratch[..n], n);

    if borrow == 1 {
        return -1;
    }

    if ct_is_zero(&scratch[..n], n) {
        0
    } else {
        1
    }
}

/// Conditionally subtracts `modulus` from `value` when `value >= modulus`,
/// without branching on the comparison — the standard "final reduction" step
/// after an operation that can overshoot the modulus by at most one multiple
/// of it (Montgomery multiplication, Barrett reduction).
fn conditional_sub(value: &mut [u64], modulus: &[u64], n: usize) {
    let mut reduced = [0u64; MAX_LIMBS];
    let borrow = sub_with_borrow(value, modulus, &mut reduced[..n], n);
    // borrow == 1 means value < modulus, i.e. no reduction was needed.
    let take_reduced = ct_mask(borrow == 0);
    let mut result = [0u64; MAX_LIMBS];

    ct_select(take_reduced, &reduced, value, &mut result[..n], n);
    value[..n].copy_from_slice(&result[..n]);
}

/// The same reduction as [`conditional_sub`], but for a value that spans `n`
/// limbs plus one extra top limb (`0` or `1`) beyond them — the shape CIOS
/// Montgomery multiplication produces before its final reduction. Dropping
/// that top limb before comparing against `modulus` silently discards a
/// `2^(64n)` bit whenever it is set, which is not rare enough to ignore: it
/// is set whenever the pre-reduction product actually reaches into `[m, 2m)`.
///
/// The result is proven to fit back in `n` limbs: `value < 2m` (CIOS's
/// standard bound) and `m < 2^(64n)`, so subtracting `modulus` once from a
/// value whose top limb is set always brings it back under `2^(64n)`.
fn conditional_sub_with_carry(
    value: &[u64],
    carry_limb: u64,
    modulus: &[u64],
    dst: &mut [u64],
    n: usize,
) {
    let mut wide_value = [0u64; MAX_LIMBS + 1];
    let mut wide_modulus = [0u64; MAX_LIMBS + 1];

    wide_value[..n].copy_from_slice(&value[..n]);
    wide_value[n] = carry_limb;
    wide_modulus[..n].copy_from_slice(&modulus[..n]);

    let mut reduced = [0u64; MAX_LIMBS + 1];
    let borrow = sub_with_borrow(
        &wide_value[..n + 1],
        &wide_modulus[..n + 1],
        &mut reduced[..n + 1],
        n + 1,
    );
    // borrow == 1 means value < modulus, i.e. no reduction was needed.
    let take_reduced = ct_mask(borrow == 0);

    ct_select(take_reduced, &reduced[..n], &wide_value[..n], dst, n);
}

// ---------------------------------------------------------------------------
// Montgomery multiplication (CIOS)
// ---------------------------------------------------------------------------

/// `dst = a * b * R⁻¹ mod m`, the Separated Operand Scanning form of CIOS
/// (Coarsely Integrated Operand Scanning) Montgomery multiplication.
///
/// `n0inv` is `-m₀⁻¹ mod 2⁶⁴` for the modulus's least significant limb —
/// computed on the caller's side from the (public) modulus, since it depends
/// on no secret value and a `bigint` computes it in a handful of operations.
///
/// Requires `a < m`, `b < m`, and `m` odd (Montgomery form requires an odd
/// modulus, which every prime beyond 2 satisfies).
fn montgomery_mul(a: &[u64], b: &[u64], modulus: &[u64], n0inv: u64, dst: &mut [u64], n: usize) {
    // t holds n + 2 limbs: n for the accumulator, one for the carry the
    // reduction step folds in, one for the carry the final addition can
    // produce.
    let mut t = [0u64; MAX_LIMBS + 2];

    for i in 0..n {
        // t += a[i] * b
        let mut carry = 0u64;

        for j in 0..n {
            let product = (a[i] as u128) * (b[j] as u128) + (t[j] as u128) + (carry as u128);

            t[j] = product as u64;
            carry = (product >> 64) as u64;
        }

        let (sum, overflow) = t[n].overflowing_add(carry);

        t[n] = sum;
        t[n + 1] += overflow as u64;

        // m = t[0] * n0inv mod 2^64; t += m * modulus. This zeroes t[0], so
        // the whole accumulator can shift down by one limb afterwards.
        let m = t[0].wrapping_mul(n0inv);
        let mut carry = 0u64;

        for j in 0..n {
            let product = (m as u128) * (modulus[j] as u128) + (t[j] as u128) + (carry as u128);

            t[j] = product as u64;
            carry = (product >> 64) as u64;
        }

        let (sum, overflow) = t[n].overflowing_add(carry);

        t[n] = sum;
        t[n + 1] += overflow as u64;

        // Shift the accumulator down by one limb; t[0] is guaranteed zero.
        for j in 0..n + 1 {
            t[j] = t[j + 1];
        }

        t[n + 1] = 0;
    }

    // The result spans t[0..n] plus a top carry limb t[n] (0 or 1); folding
    // that carry in is what `conditional_sub_with_carry` is for — dropping it
    // before comparing against the modulus would silently discard a
    // `2^(64n)` bit whenever the pre-reduction product landed in `[m, 2m)`.
    conditional_sub_with_carry(&t[..n], t[n], modulus, &mut dst[..n], n);
}

/// Converts `value` into Montgomery form: `value * R mod m`.
///
/// `r_squared` is `R² mod m` — precomputed by the caller from the (public)
/// modulus, since `R = 2^(64n)` and `R² mod m` involves no secret value.
fn to_montgomery(
    value: &[u64],
    modulus: &[u64],
    r_squared: &[u64],
    n0inv: u64,
    dst: &mut [u64],
    n: usize,
) {
    montgomery_mul(value, r_squared, modulus, n0inv, dst, n);
}

/// Converts `value` out of Montgomery form: `value * R⁻¹ mod m`.
fn from_montgomery(value: &[u64], modulus: &[u64], n0inv: u64, dst: &mut [u64], n: usize) {
    let mut one = [0u64; MAX_LIMBS];

    one[0] = 1;
    montgomery_mul(value, &one, modulus, n0inv, dst, n);
}

// ---------------------------------------------------------------------------
// Constant-time modular exponentiation (Montgomery ladder)
// ---------------------------------------------------------------------------

/// `dst = base^exponent mod modulus`, processing exactly `exp_bits` exponent
/// bits regardless of the exponent's actual value — the caller chooses
/// `exp_bits` from the public protocol parameters (e.g. always the modulus
/// bit-length for an RSA private-key operation), not from the secret
/// exponent, or the running time still leaks the exponent's bit-length.
///
/// `base` and `modulus` are ordinary (non-Montgomery) values; `r_squared` is
/// `R² mod m` as in [`to_montgomery`]. The exponent is read from `exponent`,
/// most-significant-relevant-bit first, down to bit `0`.
fn mod_exp(
    base: &[u64],
    exponent: &[u64],
    modulus: &[u64],
    r_squared: &[u64],
    n0inv: u64,
    exp_bits: u32,
    dst: &mut [u64],
    n: usize,
) {
    // Montgomery ladder: r0 tracks base^(bits seen so far), r1 tracks
    // r0 * base. Swapping the pair before combining — rather than choosing
    // which one to update — keeps the instruction sequence identical whether
    // the current bit is 0 or 1.
    let mut r0 = [0u64; MAX_LIMBS]; // Montgomery form of 1.
    let mut r1 = [0u64; MAX_LIMBS];
    let mut one = [0u64; MAX_LIMBS];

    one[0] = 1;
    to_montgomery(&one, modulus, r_squared, n0inv, &mut r0, n);
    to_montgomery(base, modulus, r_squared, n0inv, &mut r1, n);

    for bit_index in (0..exp_bits).rev() {
        let word = (bit_index / 64) as usize;
        let offset = bit_index % 64;
        let bit = if word < n {
            (exponent[word] >> offset) & 1
        } else {
            0
        };
        let mask = ct_mask(bit == 1);

        ct_swap(mask, &mut r0[..n], &mut r1[..n], n);

        let mut product = [0u64; MAX_LIMBS];

        montgomery_mul(&r0[..n], &r1[..n], modulus, n0inv, &mut product[..n], n);

        let mut squared = [0u64; MAX_LIMBS];

        montgomery_mul(&r0[..n], &r0[..n], modulus, n0inv, &mut squared[..n], n);

        r1[..n].copy_from_slice(&product[..n]);
        r0[..n].copy_from_slice(&squared[..n]);

        ct_swap(mask, &mut r0[..n], &mut r1[..n], n);
    }

    from_montgomery(&r0[..n], modulus, n0inv, dst, n);
}

// ---------------------------------------------------------------------------
// Barrett reduction
// ---------------------------------------------------------------------------

/// `dst = value mod modulus`, for a `2n`-limb `value` and an `n`-limb
/// `modulus`, using a precomputed reciprocal.
///
/// Barrett reduction trades Montgomery's per-multiplication overhead (folding
/// the modulus in during every multiply) for a single division-free reduction
/// after the fact — the right choice when the same modulus is used for only a
/// few multiplications, so Montgomery's conversion cost does not amortise.
///
/// `mu` is `⌊2^(128n) / modulus⌋`, an `n + 1`-limb value the caller
/// precomputes once per modulus (public data — an ordinary `bigint` division).
fn barrett_reduce(value: &[u64], modulus: &[u64], mu: &[u64], dst: &mut [u64], n: usize) {
    // q ≈ ⌊(value >> 64(n-1)) * mu >> 64(n+1)⌋ — the standard Barrett
    // estimate, off by at most 2 in the caller's favour; both possible
    // corrections are applied unconditionally via `conditional_sub`.
    let shifted_len = n + 1;
    let mut shifted = [0u64; MAX_LIMBS];

    for i in 0..shifted_len {
        let source = i + n - 1;

        shifted[i] = if source < 2 * n { value[source] } else { 0 };
    }

    let mu_len = n + 1;
    let mut product = [0u64; 2 * MAX_LIMBS + 2];

    for i in 0..shifted_len {
        let mut carry = 0u64;

        for j in 0..mu_len {
            let term =
                (shifted[i] as u128) * (mu[j] as u128) + (product[i + j] as u128) + (carry as u128);

            product[i + j] = term as u64;
            carry = (term >> 64) as u64;
        }

        product[i + mu_len] = product[i + mu_len].wrapping_add(carry);
    }

    let q_len = n + 1;
    let mut q = [0u64; MAX_LIMBS];

    q[..q_len].copy_from_slice(&product[shifted_len..shifted_len + q_len]);

    // r = value − q * modulus, truncated to n + 1 limbs.
    let r_len = n + 1;
    let mut qm = [0u64; MAX_LIMBS + 2];

    for i in 0..r_len {
        let mut carry = 0u64;

        for j in 0..n {
            if i + j >= r_len {
                break;
            }

            let term =
                (q[i] as u128) * (modulus[j] as u128) + (qm[i + j] as u128) + (carry as u128);

            qm[i + j] = term as u64;
            carry = (term >> 64) as u64;
        }

        if i + n < r_len {
            qm[i + n] = qm[i + n].wrapping_add(carry);
        }
    }

    let mut r = [0u64; MAX_LIMBS];

    sub_with_borrow(&value[..r_len], &qm[..r_len], &mut r[..r_len], r_len);

    // The estimate can undershoot by up to two multiples of the modulus;
    // subtract it out with the same branch-free step used everywhere else.
    conditional_sub(&mut r[..n], modulus, n);
    conditional_sub(&mut r[..n], modulus, n);

    dst[..n].copy_from_slice(&r[..n]);
}

// ---------------------------------------------------------------------------
// WASM exports — shared scratch, one slot per operand
// ---------------------------------------------------------------------------

const SLOT_A: usize = 0;
const SLOT_B: usize = MAX_LIMBS;
const SLOT_EXP: usize = 2 * MAX_LIMBS;
const SLOT_MODULUS: usize = 3 * MAX_LIMBS;
const SLOT_R_SQUARED: usize = 4 * MAX_LIMBS;
const SLOT_MU: usize = 5 * MAX_LIMBS;
const SLOT_RESULT: usize = 6 * MAX_LIMBS;
const SLOT_COUNT: usize = 7;

static mut SCRATCH: [u64; SLOT_COUNT * MAX_LIMBS] = [0u64; SLOT_COUNT * MAX_LIMBS];

/// Byte address of scratch slot A. Slot `k` starts at `fu_scratch_ptr() + k *
/// fu_slot_words() * 8`, in the order A, B, EXP, MODULUS, R_SQUARED, MU,
/// RESULT.
#[no_mangle]
pub unsafe extern "C" fn fu_scratch_ptr() -> *const u64 {
    SCRATCH.as_ptr()
}

/// Words per scratch slot ([`MAX_LIMBS`]).
#[no_mangle]
pub extern "C" fn fu_slot_words() -> i32 {
    MAX_LIMBS as i32
}

#[no_mangle]
pub unsafe extern "C" fn fu_add(n: u32) -> u32 {
    let n = n as usize;
    let a = &SCRATCH[SLOT_A..SLOT_A + n];
    let b = &SCRATCH[SLOT_B..SLOT_B + n];
    let mut dst = [0u64; MAX_LIMBS];
    let carry = add_with_carry(a, b, &mut dst[..n], n);

    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);

    carry as u32
}

#[no_mangle]
pub unsafe extern "C" fn fu_sub(n: u32) -> u32 {
    let n = n as usize;
    let a = &SCRATCH[SLOT_A..SLOT_A + n];
    let b = &SCRATCH[SLOT_B..SLOT_B + n];
    let mut dst = [0u64; MAX_LIMBS];
    let borrow = sub_with_borrow(a, b, &mut dst[..n], n);

    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);

    borrow as u32
}

#[no_mangle]
pub unsafe extern "C" fn fu_cmp(n: u32) -> i32 {
    let n = n as usize;

    cmp_limbs(
        &SCRATCH[SLOT_A..SLOT_A + n],
        &SCRATCH[SLOT_B..SLOT_B + n],
        n,
    )
}

/// `RESULT = A * B * R⁻¹ mod MODULUS`. `n0inv` is `-modulus₀⁻¹ mod 2⁶⁴`.
#[no_mangle]
pub unsafe extern "C" fn fu_mont_mul(n: u32, n0inv: u64) {
    let n = n as usize;
    let a = SCRATCH[SLOT_A..SLOT_A + n].to_vec();
    let b = SCRATCH[SLOT_B..SLOT_B + n].to_vec();
    let modulus = SCRATCH[SLOT_MODULUS..SLOT_MODULUS + n].to_vec();
    let mut dst = [0u64; MAX_LIMBS];

    montgomery_mul(&a, &b, &modulus, n0inv, &mut dst[..n], n);
    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);
}

/// `RESULT = A * R mod MODULUS`, using the precomputed `R_SQUARED` slot.
#[no_mangle]
pub unsafe extern "C" fn fu_to_mont(n: u32, n0inv: u64) {
    let n = n as usize;
    let a = SCRATCH[SLOT_A..SLOT_A + n].to_vec();
    let modulus = SCRATCH[SLOT_MODULUS..SLOT_MODULUS + n].to_vec();
    let r_squared = SCRATCH[SLOT_R_SQUARED..SLOT_R_SQUARED + n].to_vec();
    let mut dst = [0u64; MAX_LIMBS];

    to_montgomery(&a, &modulus, &r_squared, n0inv, &mut dst[..n], n);
    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);
}

/// `RESULT = A * R⁻¹ mod MODULUS`.
#[no_mangle]
pub unsafe extern "C" fn fu_from_mont(n: u32, n0inv: u64) {
    let n = n as usize;
    let a = SCRATCH[SLOT_A..SLOT_A + n].to_vec();
    let modulus = SCRATCH[SLOT_MODULUS..SLOT_MODULUS + n].to_vec();
    let mut dst = [0u64; MAX_LIMBS];

    from_montgomery(&a, &modulus, n0inv, &mut dst[..n], n);
    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);
}

/// `RESULT = A^EXP mod MODULUS`, processing exactly `exp_bits` exponent bits.
/// Needs `R_SQUARED` (`R² mod MODULUS`) precomputed as for [`fu_to_mont`].
#[no_mangle]
pub unsafe extern "C" fn fu_mod_exp(n: u32, exp_bits: u32, n0inv: u64) {
    let n = n as usize;
    let base = SCRATCH[SLOT_A..SLOT_A + n].to_vec();
    let exponent = SCRATCH[SLOT_EXP..SLOT_EXP + n].to_vec();
    let modulus = SCRATCH[SLOT_MODULUS..SLOT_MODULUS + n].to_vec();
    let r_squared = SCRATCH[SLOT_R_SQUARED..SLOT_R_SQUARED + n].to_vec();
    let mut dst = [0u64; MAX_LIMBS];

    mod_exp(
        &base,
        &exponent,
        &modulus,
        &r_squared,
        n0inv,
        exp_bits,
        &mut dst[..n],
        n,
    );
    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);
}

/// `RESULT = A mod MODULUS`, where `A` is `2n` limbs wide. Needs `MU`
/// (`⌊2^(128n) / MODULUS⌋`, `n + 1` limbs) precomputed by the caller.
///
/// `A` occupies a single `MAX_LIMBS`-wide slot even though this call reads
/// `2n` limbs from it, so `n` is implicitly capped at `MAX_LIMBS / 2` here —
/// half the limit every other export allows. `n` beyond that would read past
/// slot A into slot B's memory, which the assertion below turns into a loud
/// failure instead of a silently wrong result.
#[no_mangle]
pub unsafe extern "C" fn fu_barrett_reduce(n: u32) {
    let n = n as usize;

    assert!(
        2 * n <= MAX_LIMBS,
        "fu_barrett_reduce: n={n} exceeds the MAX_LIMBS / 2 limit for this operation"
    );

    let value = SCRATCH[SLOT_A..SLOT_A + 2 * n].to_vec();
    let modulus = SCRATCH[SLOT_MODULUS..SLOT_MODULUS + n].to_vec();
    let mu = SCRATCH[SLOT_MU..SLOT_MU + n + 1].to_vec();
    let mut dst = [0u64; MAX_LIMBS];

    barrett_reduce(&value, &modulus, &mu, &mut dst[..n], n);
    SCRATCH[SLOT_RESULT..SLOT_RESULT + n].copy_from_slice(&dst[..n]);
}
