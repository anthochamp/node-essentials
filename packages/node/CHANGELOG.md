# @ac-kit/node

## 0.3.0

### Minor Changes

- a5c4d66: - New `InetAddress`, `InetEndpoint` and `toInetAddress`, moved here from
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

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/async@0.1.2

## 0.2.0

### Minor Changes

- a493b4a: **Breaking:** `escapeCommandArg` and `escapeCommand` are gone. They dispatched
  over `process.platform` to helpers that now live in `@ac-kit/format-shell`, and
  `node` may not depend on a `format-*` package (`ARCHITECTURE.md` §3).
  
  Callers name the dialect instead, deriving it from the platform if that is what
  they want:
  
  ```ts
  import { escapeCommandArg, shellDialectForPlatform } from "@ac-kit/format-shell";
  
  escapeCommandArg(value, shellDialectForPlatform(process.platform));
  ```

- 70c1269: Rework the `net` socket and server wrappers, and add `TlsServer` / `IpcServer`
  
  - Connection helpers now always settle: a socket that closes before connecting
    rejects with the new `ConnectionClosedError` instead of leaving the promise
    pending, and `IpcSocket.connect` accepts an `AbortSignal` like its siblings.
  - `TcpSocket` and `IpcSocket` no longer register their event forwarders twice,
    which made every event dispatch to subscribers twice.
  - New `InetSocket` base class: `TlsSocket` now exposes `remoteEndpoint`,
    `localEndpoint`, `setNoDelay`, `setKeepAlive` and the connection-attempt and
    `lookup` events, previously available on `TcpSocket` only.
  - `TlsSocket.connect` destroys the transport when the handshake fails, so a
    failed `STARTTLS` upgrade can no longer fall back to cleartext. It also
    accepts a local endpoint path, for a TLS server behind a Unix domain socket.
  - `TlsSocket` fixes: `TlsSocketOptions` keeps the secure-context options (`ca`,
    `cert`, `key`, …) that were previously stripped, `getPeerCertificate` is
    overloaded instead of taking an escapable return type parameter, empty
    results are normalized to `null` consistently, `exportKeyingMaterial` takes an
    optional context, `setKeyCert` accepts `SecureContextOptions`, `renegotiate`
    takes its options optionally, and the `servername` and `secure` members are
    exposed. `getTicket()` is renamed `getTLSTicket()` to match Node.js.
  - New `StreamServer` base class with `TcpServer` rebuilt on top of it, plus
    `IpcServer` and `TlsServer`.
  - `IpcSocket.fromFd` adopts an already-open descriptor, such as a pipe
    inherited from a parent process.
  - `IpcSocketEvents` no longer declares the IP-only connection-attempt events,
    which never fired.

### Patch Changes

- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/async@0.1.1
