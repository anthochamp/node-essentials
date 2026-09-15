# @ac-kit/crypto-mac

A **message authentication code** answers one question: did this exact message
come from someone holding the shared key? A plain hash cannot — anyone who
changes the message can recompute the hash to match. HMAC mixes a secret key
into the hash, so only a key holder can produce a tag that verifies.

Reach for it when signing an API request, authenticating a webhook payload,
stamping a session cookie, or deriving a token that must not be forgeable.

```typescript
import { sha256Ts } from "@ac-kit/crypto-hash";
import { hmacSha256Ts, hmacVerify } from "@ac-kit/crypto-mac";

const key = new TextEncoder().encode("shared secret");
const message = new TextEncoder().encode("transfer 100 to alice");

const tag = hmacSha256Ts(key, message);
const authentic = hmacVerify(sha256Ts, 64, key, message, tag);
```

`hmacVerify` compares in constant time, so a wrong tag takes as long to reject
as a right one — never compare tags with `===`.

## What it exposes

- `hmac(hash, blockSizeBytes, key, message, tagLengthBytes?)` — the generic
  RFC 2104 construction over any hash function.
- `hmacVerify(hash, blockSizeBytes, key, message, tag)` — constant-time
  comparison against a freshly computed tag.
- Named wrappers binding one hash each: `hmacMd5`, `hmacSha1`, `hmacSha224`,
  `hmacSha256`, `hmacSha384`, `hmacSha512`.

Wrappers come in two shapes. A bare name (`hmacSha256`) prefers the Web Crypto
kernel and returns `Uint8Array | Promise<Uint8Array>`; the `Ts` suffix
(`hmacSha256Ts`) is always the TypeScript kernel and always synchronous. MD5 and
SHA-224 have no Web Crypto equivalent, so each offers a single synchronous
function.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/crypto-mac/)
for the full reference.

## Further reading

- [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104) — the HMAC specification
  (authoritative).
- [FIPS 198-1](https://csrc.nist.gov/pubs/fips/198-1/final) — the NIST standard
  this implements (authoritative).
