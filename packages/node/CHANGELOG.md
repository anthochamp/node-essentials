# @ac-kit/node

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
