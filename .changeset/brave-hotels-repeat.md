---
"@ac-kit/node": minor
---

- New `InetAddress`, `InetEndpoint` and `toInetAddress`, moved here from
  `@ac-kit/core` — an `InetAddress` answers what the OS told us, a family and an
  opaque address string, rather than being an address you can compute with, so
  it belongs beside the Node APIs that report it rather than in
  `@ac-kit/net-address`. `composeInetAddress` is renamed `toInetAddress`: it
  exists solely to normalise the inconsistent `family` field Node reports, which
  arrives as `"IPv4"`, as `4` or as `null` depending on which API answered, and
  "compose" named none of that. Its behaviour, including the `UnsupportedError`
  it throws on any other family, is unchanged.
- New `isPathWithin` / `assertPathWithin` and their symlink-resolving `…Async`
  counterparts, plus the `PathEscapeError` they throw. Proving that a resolved
  path stayed inside a root directory is the check that stands between a
  user-supplied name and `../../../etc/passwd`, and it is routinely written as
  `resolved.startsWith(root)` — which accepts `/var/data-evil` for a root of
  `/var/data`. Comparing resolved path segments makes the separator implicit
  instead of something the caller has to remember to append, and settles the
  trailing-separator, `.`/`..` and relative-input cases on the way. The
  asynchronous variants resolve both sides through `realpath`, falling back to
  the longest existing prefix so a path can be checked before it is created, and
  rethrow any error other than a missing path — a check that could not look must
  not answer "within". They narrow the check-to-use window rather than closing
  it, which the documentation says plainly; the asserting forms return the
  resolved path so a caller uses the value that was checked instead of resolving
  a second time. Case folding defaults to the platform's convention —
  insensitive on Windows, sensitive elsewhere — and is an option, because Node
  cannot report what the volume actually does and a case-insensitive mount under
  a case-sensitive platform would otherwise read as a different root.
