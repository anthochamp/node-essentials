# @ac-kit/net-core

The shared network protocol substrate: framing, codecs, session handling, an
exchange registry, and the `Transport` type every protocol package (`net-smtp`,
`net-imap`, `net-pop3`, `net-socketmap`, `net-http`) builds on instead of
talking to sockets directly.

That boundary is what keeps the protocol packages portable and testable: a
client written against `Transport` runs unchanged over TCP, over TLS, or over an
in-memory double in a test, and none of it imports a socket API.

```ts
import { Session, type BaseSessionEvents, type ExchangeOptions } from "@ac-kit/net-core";

// A Transport moves frames; a Session correlates a request with its reply, so a
// protocol client awaits an answer rather than wiring up callbacks.
class MyClient extends Session<string, string, BaseSessionEvents> {
  ping(options?: ExchangeOptions<string>): Promise<string> {
    return this.request("PING", () => "complete", options);
  }
}
```

## What it exposes

- `Transport` and `TransportHandlers` — the boundary a protocol is written
  against. `@ac-kit/net-transport-node` implements it for Node.
- `FrameLink` and `FrameSink` — framing a byte stream into messages, with
  `swapTransport` for a `STARTTLS`-style upgrade mid-session.
- `Session` and `PendingExchange` — correlating requests with replies, with
  `ExchangeOptions` carrying an `AbortSignal` and a `Disposition`.
- `KeyedRegistry` and `ScanningRegistry` — matching an inbound frame to the
  exchange waiting for it, by key or by scan.

Portable: no Node.js built-ins, so a protocol client built on it runs anywhere
its transport does.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-core/)
for the full reference.
