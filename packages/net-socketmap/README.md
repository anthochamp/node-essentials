# @ac-kit/net-socketmap

A client for socketmap, the protocol Postfix uses to ask an external service
whether an address exists, where to route it, or what it maps to.

It is how you put your own database behind a Postfix lookup table without
writing a Postfix plugin: Postfix sends a netstring-framed key, your service
answers `OK`, `NOTFOUND` or `TEMP`.

```ts
import { SocketmapClient } from "@ac-kit/net-socketmap";
import { DuplexTransport } from "@ac-kit/net-transport-node";

const client = new SocketmapClient(new DuplexTransport(socket.stream));

const result = await client.lookup("aliases", "postmaster@example.com");
```

Built on `@ac-kit/net-core`'s `Transport`, so the same client runs over TCP, a
Unix socket, or an in-memory double in a test. It imports no socket API itself.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-socketmap/)
for the full reference.
