# @ac-kit/net-transport-node

Node.js `Transport` implementations for `@ac-kit/net-core`, so a protocol client
written against that boundary can actually talk to a socket.

Two cover everything Node offers. `DuplexTransport` carries frames over any
`node:stream` duplex — TCP, TLS, Unix domain sockets, child-process pipes, and
the in-memory streams a test uses. `DatagramTransport` covers UDP, where there
is no stream to wrap.

```ts
import { SmtpClient } from "@ac-kit/net-smtp";
import { DuplexTransport } from "@ac-kit/net-transport-node";
import { TcpSocket } from "@ac-kit/node";

const socket = TcpSocket.from();
await socket.connect(587, { host: "mail.example.com" });

const client = new SmtpClient(new DuplexTransport(socket.stream));
```

Connection setup is deliberately not a transport's concern: it takes a stream
that is already connected, which is what keeps reconnection and TLS negotiation
policy in the caller's hands.

Writes are corked around the whole buffer list, so a multi-fragment frame
reaches the socket as one vectored write rather than one syscall per fragment.

These live here rather than in `@ac-kit/node` so that installing the Node
helpers does not drag in the protocol substrate, and so a consumer supplying its
own transport never installs these adapters at all.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-transport-node/)
for the full reference.
