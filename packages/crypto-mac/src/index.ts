/**
 * HMAC (RFC 2104 / FIPS 198-1) — a keyed-hash message authentication code.
 *
 * `_hmac-core.ts`'s `hmac()`/`hmacVerify()` are the generic construction,
 * parametrized by hash function and block size; every named export below is a
 * thin wrapper binding one specific hash. Wrappers for algorithms with a Web
 * Crypto kernel (`crypto.subtle.sign`/`.importKey`) come in the same pair as
 * their `@ac-kit/crypto-hash` counterpart: a `*Ts` name (always the TS kernel,
 * synchronous) and a bare name (prefers Web Crypto, `Uint8Array |
 * Promise<Uint8Array>`). MD5 and SHA-224 have no Web Crypto kernel, matching
 * `md5`/`sha224` themselves, so each gets one synchronous function.
 */
export * from "./hmac-core.js";
export * from "./hmac-md5.js";
export * from "./hmac-sha1.js";
export * from "./hmac-sha224.js";
export * from "./hmac-sha256.js";
export * from "./hmac-sha384.js";
export * from "./hmac-sha512.js";
