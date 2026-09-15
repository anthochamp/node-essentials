//! IEEE 754 binary soft-float arithmetic engine for WebAssembly.
//!
//! Significands are represented as multi-limb `[u64; N]` arrays (little-endian
//! limbs), giving correct arithmetic for any standard IEEE 754 binary format
//! from binary16 through binary512 without truncation.
//!
//! # Limb layout
//!
//! `limb[0]` holds bits 0..63, `limb[1]` holds bits 64..127, \u2026
//! All limbs beyond the active count (`sig_limbs(p)`) are always zero.
//!
//! # WASM ABI
//!
//! Three scratch slots live in WASM linear memory.  Call `sf_slot_words()`
//! once after instantiation to get the stride (u32 words per slot = 16,
//! which covers binary512).
//!
//! | Slot | Word offset             | Purpose          |
//! |------|-------------------------|------------------|
//! | A    | 0 \u2026 stride\u22121            | First operand    |
//! | B    | stride \u2026 2\u00b7stride\u22121     | Second operand   |
//! | R    | 2\u00b7stride \u2026 3\u00b7stride\u22121   | Result           |
//!
//! Values are packed in little-endian u32 word order (word[0] = bits 0..31).
//!
//! Usage:
//!   1. `sf_scratch_ptr()` \u2192 byte address of slot A.
//!   2. `sf_slot_words()`  \u2192 stride in u32 words (currently 16).
//!   3. Write operands into slot A and/or slot B.
//!   4. Call the operation with `(k, p, emax)` format parameters.
//!   5. Read result from slot R.
//!
//! Operations:
//!   `sf_add`, `sf_sub`, `sf_mul`, `sf_div` \u2014 A \u2295 B \u2192 R
//!   `sf_sqrt`, `sf_neg`, `sf_abs`          \u2014 A \u2192 R
//!   `sf_cmp`                               \u2014 A vs B \u2192 i32 (\u22121/0/1/i32::MIN for NaN)
//!
//! References:
//!   - IEEE 754-2019
//!   - Goldberg, "What Every Computer Scientist Should Know About Floating-Point"
//!   - Berkeley IeeeBinaryUnpacked (reference implementation)

#![no_std]

// ---------------------------------------------------------------------------
// Panic handler required for no_std WASM
// ---------------------------------------------------------------------------

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum significant limbs: 8 x 64 = 512 bits -- covers binary512.
const MAX_SIG_LIMBS: usize = 8;

/// Maximum product limbs for multiplication: 2 x MAX_SIG_LIMBS = 16.
const MAX_PROD_LIMBS: usize = MAX_SIG_LIMBS * 2;

/// u32 words per scratch slot: 16 x 32 = 512 bits -- covers binary512.
const MAX_SLOT_WORDS: usize = MAX_SIG_LIMBS * 2; // = 16

// ---------------------------------------------------------------------------
// Sig / Wide: significand storage
//
// Limb layout: little-endian (limb[0] = bits 0..63, limb[1] = bits 64..127,
// ...).  High limbs beyond the active count are always zero.
// ---------------------------------------------------------------------------

/// Fixed-width multi-limb significand (up to MAX_SIG_LIMBS x 64 = 512 bits).
#[derive(Copy, Clone)]
struct Sig([u64; MAX_SIG_LIMBS]);

/// Double-width product: 2 x MAX_SIG_LIMBS x 64 = 1024 bits.
/// Used as a temporary during multiplication, division and normalization.
#[derive(Copy, Clone)]
struct Wide([u64; MAX_PROD_LIMBS]);

impl Sig {
    const ZERO: Self = Sig([0; MAX_SIG_LIMBS]);
}

impl Wide {
    const ZERO: Self = Wide([0; MAX_PROD_LIMBS]);
}

/// Number of u64 limbs required to hold `p` significand bits: ceil(p / 64).
#[inline(always)]
const fn sig_limbs(p: u32) -> usize {
    ((p + 63) / 64) as usize
}

// ---------------------------------------------------------------------------
// Limb arithmetic helpers -- all operate on &[u64] / &mut [u64] slices.
// ---------------------------------------------------------------------------

/// `true` if all limbs are zero.
fn is_zero(s: &[u64]) -> bool {
    s.iter().all(|&x| x == 0)
}

/// Significant-bit count: floor(log2(v)) + 1, or 0 when v == 0.
fn bit_length(s: &[u64]) -> u32 {
    for i in (0..s.len()).rev() {
        if s[i] != 0 {
            return (i as u32 + 1) * 64 - s[i].leading_zeros();
        }
    }
    0
}

/// Bit at position `pos` (0 = LSB of s[0]).
#[inline(always)]
fn bit_at(s: &[u64], pos: u32) -> bool {
    let w = (pos / 64) as usize;
    w < s.len() && (s[w] >> (pos % 64)) & 1 == 1
}

/// `true` if any bit strictly below position `pos` is set.
fn has_nonzero_below(s: &[u64], pos: u32) -> bool {
    if pos == 0 { return false; }
    let w = (pos / 64) as usize;
    let b = pos % 64;
    for i in 0..w.min(s.len()) {
        if s[i] != 0 { return true; }
    }
    if w < s.len() && b > 0 && (s[w] << (64 - b)) != 0 { return true; }
    false
}

/// Logical right shift: `dst = src >> n`.
/// `dst` may be shorter than `src`; only the low `dst.len()` limbs are written.
fn shr(src: &[u64], n: u32, dst: &mut [u64]) {
    let dst_len = dst.len();
    let word_shift = (n / 64) as usize;
    let bit_shift = n % 64;
    for i in 0..dst_len {
        let j = i + word_shift;
        let lo = if j < src.len() { src[j] >> bit_shift } else { 0 };
        let hi = if bit_shift > 0 && j + 1 < src.len() {
            src[j + 1] << (64 - bit_shift)
        } else {
            0
        };
        dst[i] = lo | hi;
    }
}

/// Logical left shift: `dst = src << n`.
/// `dst` length is independent of `src`; bits that overflow `dst` are lost.
fn shl(src: &[u64], n: u32, dst: &mut [u64]) {
    let dst_len = dst.len();
    for x in dst.iter_mut() { *x = 0; }
    let word_shift = (n / 64) as usize;
    let bit_shift = n % 64;
    for i in 0..src.len() {
        let j = i + word_shift;
        if j < dst_len {
            dst[j] |= if bit_shift == 0 { src[i] } else { src[i] << bit_shift };
        }
        if bit_shift > 0 && j + 1 < dst_len {
            dst[j + 1] |= src[i] >> (64 - bit_shift);
        }
    }
}

/// Add 1 at bit position `pos` with carry propagation.
fn set_add_bit(s: &mut [u64], pos: u32) {
    let mut i = (pos / 64) as usize;
    if i >= s.len() { return; }
    let (v, mut carry) = s[i].overflowing_add(1u64 << (pos % 64));
    s[i] = v;
    i += 1;
    while carry && i < s.len() {
        let (v2, c2) = s[i].overflowing_add(1);
        s[i] = v2;
        carry = c2;
        i += 1;
    }
}

/// `dst = a + b`. Returns `true` on carry out.
/// All three slices must be the same length.
fn limb_add(a: &[u64], b: &[u64], dst: &mut [u64]) -> bool {
    let mut carry = false;
    for i in 0..a.len() {
        let (s1, c1) = a[i].overflowing_add(b[i]);
        let (s2, c2) = s1.overflowing_add(carry as u64);
        dst[i] = s2;
        carry = c1 | c2;
    }
    carry
}

/// `dst = a - b`.  All three slices must be the same length.  Assumes a >= b.
fn limb_sub(a: &[u64], b: &[u64], dst: &mut [u64]) {
    let mut borrow = false;
    for i in 0..a.len() {
        let (d1, b1) = a[i].overflowing_sub(b[i]);
        let (d2, b2) = d1.overflowing_sub(borrow as u64);
        dst[i] = d2;
        borrow = b1 | b2;
    }
}

/// Three-way comparison of equal-length slices: -1, 0, or 1.
fn limb_cmp(a: &[u64], b: &[u64]) -> i32 {
    for i in (0..a.len()).rev() {
        if a[i] > b[i] { return 1; }
        if a[i] < b[i] { return -1; }
    }
    0
}

/// a >= b over equal-length slices.
#[inline(always)]
fn limb_gte(a: &[u64], b: &[u64]) -> bool {
    limb_cmp(a, b) >= 0
}

/// Schoolbook multiplication: a[0..n] x b[0..n] -> dst[0..2n].
/// Both input slices must have the same length n; dst must be >= 2n wide.
fn limb_mul(a: &[u64], b: &[u64], dst: &mut [u64]) {
    let n = a.len();
    for x in dst.iter_mut() { *x = 0; }
    for i in 0..n {
        let mut carry: u64 = 0;
        for j in 0..n {
            // (a[i] as u128) * (b[j] as u128) never overflows u128.
            let prod = (a[i] as u128) * (b[j] as u128)
                + dst[i + j] as u128
                + carry as u128;
            dst[i + j] = prod as u64;
            carry = (prod >> 64) as u64;
        }
        // Propagate the final carry into dst[i + n].
        let mut ki = i + n;
        let mut c = carry;
        while c != 0 && ki < dst.len() {
            let (v, nc) = dst[ki].overflowing_add(c);
            dst[ki] = v;
            c = nc as u64;
            ki += 1;
        }
    }
}

/// Binary restoring division: q = floor(num / den).
/// `num` is up to MAX_PROD_LIMBS wide; `den` is up to MAX_SIG_LIMBS wide.
/// `q` must be at least num.len() wide.
fn limb_div(num: &[u64], den: &[u64], q: &mut [u64]) {
    let qn = q.len();
    for x in q.iter_mut() { *x = 0; }
    if is_zero(num) { return; }

    // Pad den to qn limbs for uniform operations.
    let mut den_padded = [0u64; MAX_PROD_LIMBS];
    let dn = den.len().min(MAX_PROD_LIMBS);
    den_padded[..dn].copy_from_slice(&den[..dn]);

    let n_bits = bit_length(&num[..qn]);
    let d_bits = bit_length(&den_padded[..qn]);
    if d_bits > n_bits { return; }

    let start_bit = n_bits - d_bits;
    let mut rem = [0u64; MAX_PROD_LIMBS];
    rem[..qn].copy_from_slice(&num[..qn]);

    let mut bit = start_bit;
    loop {
        let mut d_shifted = [0u64; MAX_PROD_LIMBS];
        shl(&den_padded[..qn], bit, &mut d_shifted[..qn]);
        if limb_gte(&rem[..qn], &d_shifted[..qn]) {
            let mut tmp = [0u64; MAX_PROD_LIMBS];
            limb_sub(&rem[..qn], &d_shifted[..qn], &mut tmp[..qn]);
            rem[..qn].copy_from_slice(&tmp[..qn]);
            set_add_bit(&mut q[..qn], bit);
        }
        if bit == 0 { break; }
        bit -= 1;
    }
}

/// Integer square root via the digit-by-digit (non-restoring) binary algorithm:
/// out = floor(sqrt(n)).
/// n_slice is up to MAX_PROD_LIMBS wide; out is MAX_SIG_LIMBS wide.
fn limb_isqrt(n_slice: &[u64], out: &mut [u64]) {
    let pn = out.len();
    for x in out.iter_mut() { *x = 0; }
    let n_len = n_slice.len().min(MAX_PROD_LIMBS);
    if is_zero(&n_slice[..n_len]) { return; }

    let n_bits = bit_length(&n_slice[..n_len]);
    if n_bits == 0 { return; }

    // Highest power of 4 <= n: 1 << (2 * floor((n_bits - 1) / 2)).
    let mut bit_pos = 2 * ((n_bits - 1) / 2);
    let work_len = n_len.max(pn + 1).min(MAX_PROD_LIMBS);

    let mut n_work = [0u64; MAX_PROD_LIMBS];
    n_work[..n_len].copy_from_slice(&n_slice[..n_len]);

    loop {
        // test = out + (1 << bit_pos)
        let mut test = [0u64; MAX_PROD_LIMBS];
        test[..pn].copy_from_slice(out);
        set_add_bit(&mut test[..work_len], bit_pos);

        if limb_gte(&n_work[..work_len], &test[..work_len]) {
            // n_work -= test;  out = (out >> 1) + (1 << bit_pos)
            let mut tmp = [0u64; MAX_PROD_LIMBS];
            limb_sub(&n_work[..work_len], &test[..work_len], &mut tmp[..work_len]);
            n_work[..work_len].copy_from_slice(&tmp[..work_len]);

            let mut new_out = [0u64; MAX_SIG_LIMBS];
            shr(out, 1, &mut new_out[..pn]);
            set_add_bit(&mut new_out[..pn], bit_pos);
            out[..pn].copy_from_slice(&new_out[..pn]);
        } else {
            // out >>= 1
            let mut tmp = [0u64; MAX_SIG_LIMBS];
            shr(out, 1, &mut tmp[..pn]);
            out[..pn].copy_from_slice(&tmp[..pn]);
        }

        if bit_pos < 2 { break; }
        bit_pos -= 2;
    }
}

// ---------------------------------------------------------------------------
// IEEE 754 format descriptor
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct Fmt {
    /// Total storage width in bits (e.g. 512 for binary512).
    k: u32,
    /// Precision including implicit leading bit (e.g. 489 for binary512).
    p: u32,
    /// Maximum unbiased exponent (= bias) (e.g. 262143 for binary512).
    emax: i32,
}

impl Fmt {
    /// Trailing (explicit) significand bits: t = p - 1.
    #[inline(always)]
    fn t(&self) -> u32 { self.p - 1 }
    /// Exponent field width: w = k - p.
    #[inline(always)]
    fn w(&self) -> u32 { self.k - self.p }
    /// Exponent bias (= emax for IEEE 754 binary formats).
    #[inline(always)]
    fn bias(&self) -> i32 { self.emax }
    /// All-ones biased exponent (NaN / Inf sentinel): 2^w - 1.
    #[inline(always)]
    fn all_ones_exp(&self) -> u32 { (1u32 << self.w()) - 1 }
    /// Minimum unbiased exponent: emin = 1 - emax.
    #[inline(always)]
    fn emin(&self) -> i32 { 1 - self.emax }
    /// Number of u32 scratch words required: ceil(k / 32).
    #[inline(always)]
    fn n_words(&self) -> usize { ((self.k + 31) / 32) as usize }
    /// Number of u64 limbs required: ceil(p / 64).
    #[inline(always)]
    fn n_limbs(&self) -> usize { sig_limbs(self.p) }
}

// ---------------------------------------------------------------------------
// Bit transfer: packed u32 word arrays <-> u64 limb arrays
//
// Word arrays: words[0] = bits 0..31, words[1] = bits 32..63, ...
// ---------------------------------------------------------------------------

/// Extract a field of `len_bits` wide at bit `start` from a packed u32 array.
/// Return value fits in u64; suited for the exponent field (always <= 19 bits).
fn get_bits_u64(words: &[u32], start: u32, len_bits: u32) -> u64 {
    let mut result: u64 = 0;
    let mut remaining = len_bits;
    let mut bit_pos = start;
    let mut out_bit = 0u32;
    while remaining > 0 {
        let w = (bit_pos / 32) as usize;
        let b = bit_pos % 32;
        let avail = (32 - b).min(remaining);
        let mask = if avail < 32 { (1u32 << avail) - 1 } else { !0u32 };
        let bits = (words[w] >> b) & mask;
        result |= (bits as u64) << out_bit;
        out_bit += avail;
        bit_pos += avail;
        remaining -= avail;
    }
    result
}

/// Write `value` into a `len_bits`-wide field at bit `start` in a packed u32 array.
fn set_bits_u64(words: &mut [u32], start: u32, len_bits: u32, value: u64) {
    let mut remaining = len_bits;
    let mut bit_pos = start;
    let mut in_bit = 0u32;
    while remaining > 0 {
        let w = (bit_pos / 32) as usize;
        let b = bit_pos % 32;
        let avail = (32 - b).min(remaining);
        let mask = if avail < 32 { (1u32 << avail) - 1 } else { !0u32 };
        words[w] &= !(mask << b);
        let bits = ((value >> in_bit) as u32) & mask;
        words[w] |= bits << b;
        in_bit += avail;
        bit_pos += avail;
        remaining -= avail;
    }
}

/// Extract `len_bits` bits from a packed u32 array into multi-limb u64 `out`.
/// Used to read the trailing significand from the packed format.
fn sig_from_words(words: &[u32], start: u32, len_bits: u32, out: &mut [u64]) {
    for x in out.iter_mut() { *x = 0; }
    if len_bits == 0 { return; }
    let mut remaining = len_bits;
    let mut bit_pos = start;
    let mut out_bit = 0u32;
    while remaining > 0 {
        let w = (bit_pos / 32) as usize;
        let b = bit_pos % 32;
        let avail = (32 - b).min(remaining).min(32);
        let mask = if avail < 32 { (1u32 << avail) - 1 } else { !0u32 };
        let bits = (words[w] >> b) & mask;
        let out_w = (out_bit / 64) as usize;
        let out_b = out_bit % 64;
        if out_w < out.len() {
            out[out_w] |= (bits as u64) << out_b;
            if out_b + avail > 64 && out_w + 1 < out.len() {
                out[out_w + 1] |= (bits as u64) >> (64 - out_b);
            }
        }
        out_bit += avail;
        bit_pos += avail;
        remaining -= avail;
    }
}

/// Store multi-limb significand `sig` into a packed u32 array:
/// write `len_bits` bits starting at bit `start`.
fn sig_to_words(sig: &[u64], words: &mut [u32], start: u32, len_bits: u32) {
    if len_bits == 0 { return; }
    let mut remaining = len_bits;
    let mut bit_pos = start;
    let mut in_bit = 0u32;
    while remaining > 0 {
        let w = (bit_pos / 32) as usize;
        let b = bit_pos % 32;
        let avail = (32 - b).min(remaining).min(32);
        let mask = if avail < 32 { (1u32 << avail) - 1 } else { !0u32 };
        let in_w = (in_bit / 64) as usize;
        let in_b = in_bit % 64;
        let bits = if in_w < sig.len() {
            let lo = sig[in_w] >> in_b;
            let hi = if in_b + avail > 64 && in_w + 1 < sig.len() {
                sig[in_w + 1] << (64 - in_b)
            } else {
                0
            };
            ((lo | hi) as u32) & mask
        } else {
            0
        };
        words[w] = (words[w] & !(mask << b)) | (bits << b);
        in_bit += avail;
        bit_pos += avail;
        remaining -= avail;
    }
}

fn clear_words(words: &mut [u32]) {
    for w in words.iter_mut() { *w = 0; }
}

#[inline(always)]
fn set_sign_bit(words: &mut [u32], fmt: &Fmt) {
    words[((fmt.k - 1) / 32) as usize] |= 1u32 << ((fmt.k - 1) % 32);
}

// ---------------------------------------------------------------------------
// IeeeBinaryUnpacked: unpacked representation
//
// Convention (mirrors TypeScript _soft-float-unpack.ts):
//   Normal value = (-1)^sign x sig x 2^(exp - (p-1)), 2^(p-1) <= sig < 2^p.
//   Subnormals are stored in pseudo-normal form (same formula, exp < emin).
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
enum Sf {
    Finite { sign: bool, exp: i32, sig: Sig },
    Zero(bool),
    Inf(bool),
    /// NaN payload (quiet bit always set).
    Nan(Sig),
}

impl Sf {
    fn sign(self) -> bool {
        match self {
            Sf::Finite { sign, .. } | Sf::Inf(sign) | Sf::Zero(sign) => sign,
            Sf::Nan(_) => false,
        }
    }
}

// ---------------------------------------------------------------------------
// Unpack: packed u32 words -> IeeeBinaryUnpacked
// ---------------------------------------------------------------------------

fn unpack(words: &[u32], fmt: &Fmt) -> Sf {
    let t = fmt.t();
    let n = fmt.n_limbs();
    let sign = (words[((fmt.k - 1) / 32) as usize] >> ((fmt.k - 1) % 32)) & 1 == 1;
    let biased_exp = get_bits_u64(words, t, fmt.w()) as u32;
    let all_ones = fmt.all_ones_exp();

    let mut trail = Sig::ZERO;
    sig_from_words(words, 0, t, &mut trail.0[..n]);

    if biased_exp == all_ones {
        if is_zero(&trail.0[..n]) {
            return Sf::Inf(sign);
        }
        // Force quiet bit (bit t - 1).
        trail.0[((t - 1) / 64) as usize] |= 1u64 << ((t - 1) % 64);
        return Sf::Nan(trail);
    }

    if biased_exp == 0 {
        if is_zero(&trail.0[..n]) {
            return Sf::Zero(sign);
        }
        // Subnormal -> pseudo-normal form.
        let blen = bit_length(&trail.0[..n]) as i32;
        let shift_amt = t as i32 - (blen - 1);
        let mut sig = Sig::ZERO;
        if shift_amt >= 0 {
            shl(&trail.0[..n], shift_amt as u32, &mut sig.0[..n]);
        } else {
            shr(&trail.0[..n], (-shift_amt) as u32, &mut sig.0[..n]);
        }
        let exp = fmt.emin() - shift_amt;
        return Sf::Finite { sign, exp, sig };
    }

    // Normal: attach implicit leading bit at position t.
    trail.0[(t / 64) as usize] |= 1u64 << (t % 64);
    let exp = biased_exp as i32 - fmt.bias();
    Sf::Finite { sign, exp, sig: trail }
}

// ---------------------------------------------------------------------------
// Pack: IeeeBinaryUnpacked -> packed u32 words
// ---------------------------------------------------------------------------

fn pack(sf: Sf, words: &mut [u32], fmt: &Fmt) {
    clear_words(words);
    let t = fmt.t();
    let n = fmt.n_limbs();
    let all_ones = fmt.all_ones_exp();

    match sf {
        Sf::Zero(sign) => {
            if sign { set_sign_bit(words, fmt); }
        }
        Sf::Inf(sign) => {
            if sign { set_sign_bit(words, fmt); }
            set_bits_u64(words, t, fmt.w(), all_ones as u64);
        }
        Sf::Nan(mut payload) => {
            // Always ensure quiet bit (bit t - 1) is set.
            payload.0[((t - 1) / 64) as usize] |= 1u64 << ((t - 1) % 64);
            set_bits_u64(words, t, fmt.w(), all_ones as u64);
            sig_to_words(&payload.0[..n], words, 0, t);
        }
        Sf::Finite { sign, exp, sig } => {
            if sign { set_sign_bit(words, fmt); }
            let biased_exp = exp + fmt.bias();
            if biased_exp >= 1 {
                // Normal: store exponent and trailing significand (implicit bit stripped).
                set_bits_u64(words, t, fmt.w(), biased_exp as u64);
                let mut trail = sig;
                trail.0[(t / 64) as usize] &= !(1u64 << (t % 64));
                sig_to_words(&trail.0[..n], words, 0, t);
            } else {
                // Subnormal / deep underflow.
                // Right-shift the full p-bit significand (with implicit leading bit)
                // by (1 - biased_exp) to produce the subnormal stored form.
                let shift = (1 - biased_exp) as u32;
                if shift < fmt.p {
                    let mut sub_sig = Sig::ZERO;
                    shr(&sig.0[..n], shift, &mut sub_sig.0[..n]);
                    sig_to_words(&sub_sig.0[..n], words, 0, t);
                }
                // Deep underflow (shift >= p): all-zero, already cleared.
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Normalize + round-to-nearest-even
//
// Input:  value = wide x 2^raw_exp   (wide is any width in u64 limbs)
// Output: (Sig, exp) where value ~= Sig x 2^(exp - (p-1)), Sig has p bits.
//
// Mirrors TypeScript sfNormalize exactly.
// ---------------------------------------------------------------------------

fn normalize(wide: &[u64], raw_exp: i32, fmt: &Fmt, sticky: bool) -> (Sig, i32) {
    if is_zero(wide) { return (Sig::ZERO, 0); }

    let n = fmt.n_limbs();
    let p_i = fmt.p as i32;
    let len = bit_length(wide) as i32;
    let base_exp = raw_exp + len - 1;

    // Below emin only part of the significand is representable. Rounding to
    // p bits here and letting the packer round again onto the subnormal grid
    // double-rounds, which moves results by an ulp in either direction, so
    // the reduced width is applied now and the packer finds nothing left to
    // do. Mirrors TypeScript `sfNormalize` exactly.
    let emin = fmt.emin();
    let target = if base_exp < emin { p_i - (emin - base_exp) } else { p_i };

    if target <= 0 {
        // Below the smallest subnormal, but not necessarily zero: anything
        // above half of it rounds up to it.
        let half = emin - p_i - raw_exp;
        let rounds_up = if half < 0 {
            true
        } else {
            let bl = bit_length(wide) as i32;
            if bl - 1 > half {
                true
            } else if bl - 1 < half {
                false
            } else {
                has_nonzero_below(wide, half as u32) || sticky
            }
        };

        if !rounds_up {
            return (Sig::ZERO, 0);
        }

        let mut result = Sig::ZERO;
        set_add_bit(&mut result.0[..n], (p_i - 1) as u32);
        return (result, emin - p_i + 1);
    }

    if len > target {
        // Too many bits — must round away (len − target) low-order bits.
        let extra = (len - target) as u32;
        let guard = bit_at(wide, extra - 1);
        let sticky_bit = sticky || has_nonzero_below(wide, extra - 1);
        let lsb = bit_at(wide, extra);

        let mut result = Sig::ZERO;
        shr(wide, extra, &mut result.0[..n]);

        if guard && (sticky_bit || lsb) {
            set_add_bit(&mut result.0[..n], 0);
        }

        let pad = (p_i - target) as u32;

        // A round-up may carry into a new leading bit.
        if bit_length(&result.0[..n]) as i32 > target {
            let mut halved = Sig::ZERO;
            shr(&result.0[..n], 1, &mut halved.0[..n]);
            let mut padded = Sig::ZERO;
            shl(&halved.0[..n], pad, &mut padded.0[..n]);
            return (padded, base_exp + 1);
        }

        // Restore the p-bit convention; the low bits are zero by construction.
        let mut padded = Sig::ZERO;
        shl(&result.0[..n], pad, &mut padded.0[..n]);
        return (padded, base_exp);
    }

    let mut result = Sig::ZERO;
    if len < p_i {
        let shift = (p_i - len) as u32;
        shl(wide, shift, &mut result.0[..n]);
    } else {
        let copy_n = n.min(wide.len());
        result.0[..copy_n].copy_from_slice(&wide[..copy_n]);
    }
    (result, base_exp)
}

// ---------------------------------------------------------------------------
// Clamp result: overflow -> Inf, underflow -> Zero
// ---------------------------------------------------------------------------

fn finite_or_special(sig: Sig, exp: i32, sign: bool, fmt: &Fmt) -> Sf {
    let n = fmt.n_limbs();
    if is_zero(&sig.0[..n]) { return Sf::Zero(sign); }
    if exp > fmt.emax { return Sf::Inf(sign); }
    if exp < fmt.emin() - (fmt.p as i32 - 1) { return Sf::Zero(sign); }
    Sf::Finite { sign, exp, sig }
}

// ---------------------------------------------------------------------------
// Negation / absolute value -- pure sign-bit operations
// ---------------------------------------------------------------------------

fn sf_neg_kernel(a: Sf) -> Sf {
    match a {
        Sf::Finite { sign, exp, sig } => Sf::Finite { sign: !sign, exp, sig },
        Sf::Inf(sign) => Sf::Inf(!sign),
        Sf::Zero(sign) => Sf::Zero(!sign),
        Sf::Nan(p) => Sf::Nan(p),
    }
}

fn sf_abs_kernel(a: Sf) -> Sf {
    match a {
        Sf::Finite { sign: _, exp, sig } => Sf::Finite { sign: false, exp, sig },
        Sf::Inf(_) => Sf::Inf(false),
        Sf::Zero(_) => Sf::Zero(false),
        Sf::Nan(p) => Sf::Nan(p),
    }
}

// ---------------------------------------------------------------------------
// Addition helpers
// ---------------------------------------------------------------------------

fn add_magnitudes(
    a_exp: i32, a_sig: Sig,
    b_exp: i32, b_sig: Sig,
    result_sign: bool, fmt: &Fmt,
) -> Sf {
    let n = fmt.n_limbs();
    let p = fmt.p;

    // Ensure a has the larger (or equal) exponent.
    let (a_exp, a_sig, b_exp, b_sig) = if a_exp >= b_exp {
        (a_exp, a_sig, b_exp, b_sig)
    } else {
        (b_exp, b_sig, a_exp, a_sig)
    };

    // Align by scaling `a` up rather than truncating `b` down, so the sum is
    // exact and `normalize` rounds once with every discarded bit still
    // present. Shifting `b` right loses the sticky information whenever the
    // sum lands on exactly `p` bits, which used to round `1 + 0.1` down by
    // one ulp.
    let shift = (a_exp - b_exp) as u32;
    let mut sticky = false;
    let mut raw_exp = a_exp - (fmt.p as i32 - 1);
    let mut a_wide = [0u64; MAX_PROD_LIMBS];
    let mut b_wide = [0u64; MAX_PROD_LIMBS];
    b_wide[..n].copy_from_slice(&b_sig.0[..n]);

    if shift == 0 {
        a_wide[..n].copy_from_slice(&a_sig.0[..n]);
    } else if shift > p + 2 {
        // b sits below every bit that could affect the rounding decision.
        sticky = !is_zero(&b_sig.0[..n]);
        a_wide[..n].copy_from_slice(&a_sig.0[..n]);
        b_wide = [0u64; MAX_PROD_LIMBS];
    } else {
        shl(&a_sig.0[..n], shift, &mut a_wide);
        raw_exp -= shift as i32;
    }

    let mut sum = [0u64; MAX_PROD_LIMBS];
    limb_add(&a_wide, &b_wide, &mut sum);

    let (sig, exp) = normalize(&sum, raw_exp, fmt, sticky);
    finite_or_special(sig, exp, result_sign, fmt)
}

fn sub_magnitudes(
    a_exp: i32, a_sig: Sig,
    b_exp: i32, b_sig: Sig,
    possible_sign: bool, fmt: &Fmt,
) -> Sf {
    let n = fmt.n_limbs();
    let p = fmt.p;

    let (a_exp, a_sig, b_exp, b_sig, flipped) = if a_exp >= b_exp {
        (a_exp, a_sig, b_exp, b_sig, false)
    } else {
        (b_exp, b_sig, a_exp, a_sig, true)
    };

    // Same exact alignment as addition: scale the larger operand up so no
    // bit is discarded before the single rounding in `normalize`.
    let shift = (a_exp - b_exp) as u32;
    let mut sticky = false;
    let mut raw_exp = a_exp - (fmt.p as i32 - 1);
    let mut a_wide = [0u64; MAX_PROD_LIMBS];
    let mut b_wide = [0u64; MAX_PROD_LIMBS];
    b_wide[..n].copy_from_slice(&b_sig.0[..n]);

    if shift == 0 {
        a_wide[..n].copy_from_slice(&a_sig.0[..n]);
    } else if shift > p + 2 {
        sticky = !is_zero(&b_sig.0[..n]);
        a_wide[..n].copy_from_slice(&a_sig.0[..n]);
        b_wide = [0u64; MAX_PROD_LIMBS];
    } else {
        shl(&a_sig.0[..n], shift, &mut a_wide);
        raw_exp -= shift as i32;
    }

    let (diff, result_sign) = if limb_gte(&a_wide, &b_wide) {
        let mut d = [0u64; MAX_PROD_LIMBS];
        limb_sub(&a_wide, &b_wide, &mut d);
        (d, if flipped { !possible_sign } else { possible_sign })
    } else {
        let mut d = [0u64; MAX_PROD_LIMBS];
        limb_sub(&b_wide, &a_wide, &mut d);
        (d, if flipped { possible_sign } else { !possible_sign })
    };

    if is_zero(&diff) {
        return Sf::Zero(false); // exact cancellation -> +0
    }

    let (sig, exp) = normalize(&diff, raw_exp, fmt, sticky);
    finite_or_special(sig, exp, result_sign, fmt)
}

// ---------------------------------------------------------------------------
// Addition / Subtraction
// ---------------------------------------------------------------------------

fn sf_add_kernel(a: Sf, b: Sf, fmt: &Fmt) -> Sf {
    if let Sf::Nan(p) = a { return Sf::Nan(p); }
    if let Sf::Nan(p) = b { return Sf::Nan(p); }

    match (a, b) {
        (Sf::Inf(sa), Sf::Inf(sb)) => {
            return if sa != sb { Sf::Nan(Sig::ZERO) } else { a };
        }
        (Sf::Inf(_), _) => return a,
        (_, Sf::Inf(_)) => return b,
        _ => {}
    }

    match (a, b) {
        (Sf::Zero(sa), Sf::Zero(sb)) => return Sf::Zero(sa & sb),
        (Sf::Zero(_), _) => return b,
        (_, Sf::Zero(_)) => return a,
        _ => {}
    }

    let Sf::Finite { sign: sa, exp: ea, sig: siga } = a else { unreachable!() };
    let Sf::Finite { sign: sb, exp: eb, sig: sigb } = b else { unreachable!() };

    if sa == sb {
        add_magnitudes(ea, siga, eb, sigb, sa, fmt)
    } else {
        sub_magnitudes(ea, siga, eb, sigb, sa, fmt)
    }
}

fn sf_sub_kernel(a: Sf, b: Sf, fmt: &Fmt) -> Sf {
    sf_add_kernel(a, sf_neg_kernel(b), fmt)
}

// ---------------------------------------------------------------------------
// Multiplication
// ---------------------------------------------------------------------------

fn sf_mul_kernel(a: Sf, b: Sf, fmt: &Fmt) -> Sf {
    if let Sf::Nan(p) = a { return Sf::Nan(p); }
    if let Sf::Nan(p) = b { return Sf::Nan(p); }

    let result_sign = a.sign() ^ b.sign();

    match (a, b) {
        (Sf::Inf(_), Sf::Zero(_)) | (Sf::Zero(_), Sf::Inf(_)) => return Sf::Nan(Sig::ZERO),
        (Sf::Inf(_), _) | (_, Sf::Inf(_)) => return Sf::Inf(result_sign),
        _ => {}
    }

    if matches!(a, Sf::Zero(_)) || matches!(b, Sf::Zero(_)) {
        return Sf::Zero(result_sign);
    }

    let Sf::Finite { exp: ea, sig: siga, .. } = a else { unreachable!() };
    let Sf::Finite { exp: eb, sig: sigb, .. } = b else { unreachable!() };

    let n = fmt.n_limbs();
    let mut wide = [0u64; MAX_PROD_LIMBS];
    limb_mul(&siga.0[..n], &sigb.0[..n], &mut wide[..n * 2]);

    // value = sig_a x sig_b x 2^(ea + eb - 2(p-1))
    let raw_exp = ea + eb - 2 * (fmt.p as i32 - 1);
    let (sig, exp) = normalize(&wide[..n * 2], raw_exp, fmt, false);
    finite_or_special(sig, exp, result_sign, fmt)
}

// ---------------------------------------------------------------------------
// Division
// ---------------------------------------------------------------------------

fn sf_div_kernel(a: Sf, b: Sf, fmt: &Fmt) -> Sf {
    if let Sf::Nan(p) = a { return Sf::Nan(p); }
    if let Sf::Nan(p) = b { return Sf::Nan(p); }

    let result_sign = a.sign() ^ b.sign();

    if matches!(a, Sf::Inf(_)) && matches!(b, Sf::Inf(_)) { return Sf::Nan(Sig::ZERO); }
    if matches!(a, Sf::Zero(_)) && matches!(b, Sf::Zero(_)) { return Sf::Nan(Sig::ZERO); }
    if matches!(a, Sf::Inf(_)) { return Sf::Inf(result_sign); }
    if matches!(b, Sf::Inf(_)) { return Sf::Zero(result_sign); }
    if matches!(a, Sf::Zero(_)) { return Sf::Zero(result_sign); }
    if matches!(b, Sf::Zero(_)) { return Sf::Inf(result_sign); }

    let Sf::Finite { exp: ea, sig: siga, .. } = a else { unreachable!() };
    let Sf::Finite { exp: eb, sig: sigb, .. } = b else { unreachable!() };

    let n = fmt.n_limbs();
    // Scale dividend by 2^(p+2) to obtain >= p+2 bits of quotient precision.
    let scale = fmt.p + 2;
    // scaled_a fits in n + ceil(scale/64) + 1 limbs.
    let wide_n = (n + (scale as usize + 63) / 64 + 1).min(MAX_PROD_LIMBS);
    let mut scaled_a = [0u64; MAX_PROD_LIMBS];
    shl(&siga.0[..n], scale, &mut scaled_a[..wide_n]);

    let mut q = [0u64; MAX_PROD_LIMBS];
    limb_div(&scaled_a[..wide_n], &sigb.0[..n], &mut q[..wide_n]);

    // sticky = scaled_a mod sigb != 0
    let mut prod = [0u64; MAX_PROD_LIMBS];
    let prod_n = (n * 2).min(MAX_PROD_LIMBS);
    limb_mul(&q[..n], &sigb.0[..n], &mut prod[..prod_n]);
    let chk_n = wide_n.min(prod_n);
    let sticky = limb_cmp(&scaled_a[..chk_n], &prod[..chk_n]) != 0;

    let raw_exp = ea - eb - scale as i32;
    let (sig, exp) = normalize(&q[..wide_n], raw_exp, fmt, sticky);
    finite_or_special(sig, exp, result_sign, fmt)
}

// ---------------------------------------------------------------------------
// Square root
// ---------------------------------------------------------------------------

fn sf_sqrt_kernel(a: Sf, fmt: &Fmt) -> Sf {
    match a {
        Sf::Nan(p)           => Sf::Nan(p),
        Sf::Zero(_)          => a,                       // sqrt(+-0) = +-0
        Sf::Inf(false)       => a,                       // sqrt(+inf) = +inf
        Sf::Inf(true)        => Sf::Nan(Sig::ZERO),      // sqrt(-inf) = NaN
        Sf::Finite { sign: true, .. } => Sf::Nan(Sig::ZERO), // sqrt(negative) = NaN
        Sf::Finite { sign: false, exp, sig } => {
            let n = fmt.n_limbs();
            let p = fmt.p;

            // Expand to 2p + 2 bits so the root carries p + 1 bits. With
            // only p bits `normalize` has nothing to discard, and a sticky
            // bit it cannot act on is a sticky bit that rounds every inexact
            // root down.
            // Adjust expansion so the positional exponent k = exp - (p-1) is
            // even, ensuring sqrt(sig x 2^k) = isqrt(sig_expanded) x 2^(k/2).
            let cur_len = bit_length(&sig.0[..n]) as i32;
            let target_len = 2 * p as i32 + 2;
            let mut s = target_len - cur_len;
            let k = exp - (p as i32 - 1);
            if (k - s) & 1 != 0 { s += 1; }

            let exp_bits = (cur_len + s) as u32;
            let exp_n = ((exp_bits + 63) / 64) as usize;
            let exp_n = exp_n.min(MAX_PROD_LIMBS);

            let mut expanded = [0u64; MAX_PROD_LIMBS];
            shl(&sig.0[..n], s as u32, &mut expanded[..exp_n]);

            // `limb_isqrt` accumulates its answer at the scale of the input
            // during the loop, converging to the true (much narrower) root
            // only in the final iterations — an `out` buffer sized for the
            // root alone truncates every early bit the loop sets and starts
            // the whole computation from a corrupted zero. Give it the wide
            // buffer the loop actually needs, and take only the low limbs
            // the root can occupy once it has converged.
            let mut isqrt_out = [0u64; MAX_PROD_LIMBS];
            limb_isqrt(&expanded[..exp_n], &mut isqrt_out[..exp_n]);
            let mut sqrt_sig = Sig::ZERO;
            sqrt_sig.0[..n].copy_from_slice(&isqrt_out[..n]);

            // sticky = expanded != sqrt_sig^2
            let mut sq = [0u64; MAX_PROD_LIMBS];
            let sq_n = (n * 2).min(MAX_PROD_LIMBS);
            limb_mul(&sqrt_sig.0[..n], &sqrt_sig.0[..n], &mut sq[..sq_n]);
            let chk_n = exp_n.min(sq_n);
            let sticky = limb_cmp(&expanded[..chk_n], &sq[..chk_n]) != 0;

            let raw_exp = (k - s) >> 1;
            let (sig_out, exp_out) = normalize(&sqrt_sig.0[..n], raw_exp, fmt, sticky);
            finite_or_special(sig_out, exp_out, false, fmt)
        }
    }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/// Returns -1 / 0 / 1 for ordered comparison.
/// Returns i32::MIN if either operand is NaN (unordered).
fn sf_cmp_kernel(a: Sf, b: Sf, fmt: &Fmt) -> i32 {
    if matches!(a, Sf::Nan(_)) || matches!(b, Sf::Nan(_)) { return i32::MIN; }

    let a_neg = matches!(a, Sf::Finite { sign: true, .. } | Sf::Inf(true));
    let b_neg = matches!(b, Sf::Finite { sign: true, .. } | Sf::Inf(true));

    if a_neg != b_neg { return if a_neg { -1 } else { 1 }; }
    let flip = a_neg;

    let n = fmt.n_limbs();
    let mag = match (a, b) {
        (Sf::Inf(_), Sf::Inf(_))   => 0,
        (Sf::Inf(_), _)            => 1,
        (_, Sf::Inf(_))            => -1,
        (Sf::Zero(_), Sf::Zero(_)) => 0,
        (Sf::Zero(_), _)           => -1,
        (_, Sf::Zero(_))           => 1,
        (Sf::Finite { exp: ea, sig: sa, .. },
         Sf::Finite { exp: eb, sig: sb, .. }) => {
            if ea != eb {
                if ea > eb { 1 } else { -1 }
            } else {
                limb_cmp(&sa.0[..n], &sb.0[..n])
            }
        }
        _ => unreachable!(),
    };

    if flip { -mag } else { mag }
}

// ---------------------------------------------------------------------------
// Scratch buffer and WASM exports
//
// Three slots of MAX_SLOT_WORDS u32 each:
//   Slot A: SCRATCH[0                  .. MAX_SLOT_WORDS    ]
//   Slot B: SCRATCH[MAX_SLOT_WORDS     .. 2 * MAX_SLOT_WORDS]
//   Slot R: SCRATCH[2 * MAX_SLOT_WORDS .. 3 * MAX_SLOT_WORDS]
// ---------------------------------------------------------------------------

static mut SCRATCH: [u32; 3 * MAX_SLOT_WORDS] = [0u32; 3 * MAX_SLOT_WORDS];

const SLOT_A: usize = 0;
const SLOT_B: usize = MAX_SLOT_WORDS;
const SLOT_R: usize = 2 * MAX_SLOT_WORDS;

/// Returns the byte address of scratch slot A in WASM linear memory.
#[no_mangle]
pub unsafe extern "C" fn sf_scratch_ptr() -> *const u32 {
    SCRATCH.as_ptr()
}

/// Number of u32 words per scratch slot.
/// The host uses this as the stride: slot B = A + stride, slot R = A + 2*stride.
#[no_mangle]
pub extern "C" fn sf_slot_words() -> i32 {
    MAX_SLOT_WORDS as i32
}

#[inline(always)]
unsafe fn fmt_of(k: i32, p: i32, emax: i32) -> Fmt {
    Fmt { k: k as u32, p: p as u32, emax }
}

#[inline]
unsafe fn binary_op(k: i32, p: i32, emax: i32, op: fn(Sf, Sf, &Fmt) -> Sf) {
    let fmt = fmt_of(k, p, emax);
    let nw = fmt.n_words();
    let a = unpack(&SCRATCH[SLOT_A..SLOT_A + nw], &fmt);
    let b = unpack(&SCRATCH[SLOT_B..SLOT_B + nw], &fmt);
    let r = op(a, b, &fmt);
    pack(r, &mut SCRATCH[SLOT_R..SLOT_R + nw], &fmt);
}

#[inline]
unsafe fn unary_op(k: i32, p: i32, emax: i32, op: fn(Sf, &Fmt) -> Sf) {
    let fmt = fmt_of(k, p, emax);
    let nw = fmt.n_words();
    let a = unpack(&SCRATCH[SLOT_A..SLOT_A + nw], &fmt);
    let r = op(a, &fmt);
    pack(r, &mut SCRATCH[SLOT_R..SLOT_R + nw], &fmt);
}

#[no_mangle]
pub unsafe extern "C" fn sf_add(k: i32, p: i32, emax: i32) {
    binary_op(k, p, emax, sf_add_kernel);
}

#[no_mangle]
pub unsafe extern "C" fn sf_sub(k: i32, p: i32, emax: i32) {
    binary_op(k, p, emax, sf_sub_kernel);
}

#[no_mangle]
pub unsafe extern "C" fn sf_mul(k: i32, p: i32, emax: i32) {
    binary_op(k, p, emax, sf_mul_kernel);
}

#[no_mangle]
pub unsafe extern "C" fn sf_div(k: i32, p: i32, emax: i32) {
    binary_op(k, p, emax, sf_div_kernel);
}

#[no_mangle]
pub unsafe extern "C" fn sf_sqrt(k: i32, p: i32, emax: i32) {
    unary_op(k, p, emax, sf_sqrt_kernel);
}

#[no_mangle]
pub unsafe extern "C" fn sf_neg(k: i32, p: i32, emax: i32) {
    let fmt = fmt_of(k, p, emax);
    let nw = fmt.n_words();
    let a = unpack(&SCRATCH[SLOT_A..SLOT_A + nw], &fmt);
    let r = sf_neg_kernel(a);
    pack(r, &mut SCRATCH[SLOT_R..SLOT_R + nw], &fmt);
}

#[no_mangle]
pub unsafe extern "C" fn sf_abs(k: i32, p: i32, emax: i32) {
    let fmt = fmt_of(k, p, emax);
    let nw = fmt.n_words();
    let a = unpack(&SCRATCH[SLOT_A..SLOT_A + nw], &fmt);
    let r = sf_abs_kernel(a);
    pack(r, &mut SCRATCH[SLOT_R..SLOT_R + nw], &fmt);
}

/// Returns -1, 0, or +1 for ordered comparison.
/// Returns i32::MIN (-2147483648) when either operand is NaN; the TypeScript
/// wrapper converts this to a RangeError.
#[no_mangle]
pub unsafe extern "C" fn sf_cmp(k: i32, p: i32, emax: i32) -> i32 {
    let fmt = fmt_of(k, p, emax);
    let nw = fmt.n_words();
    let a = unpack(&SCRATCH[SLOT_A..SLOT_A + nw], &fmt);
    let b = unpack(&SCRATCH[SLOT_B..SLOT_B + nw], &fmt);
    sf_cmp_kernel(a, b, &fmt)
}
