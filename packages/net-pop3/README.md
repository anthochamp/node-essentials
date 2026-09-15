# @ac-kit/net-pop3

A POP3 client — the protocol for downloading mail from a server and, usually,
deleting it there.

```ts
import { Pop3Client } from "@ac-kit/net-pop3";
import { DuplexTransport } from "@ac-kit/net-transport-node";

const client = new Pop3Client(new DuplexTransport(socket.stream));

await client.user("alice");
await client.pass(password);

const { lines } = await client.list();
const message = await client.retr(1);
await client.dele(1);
await client.quit();
```

Every POP3 command has a method: `user`, `pass`, `stat`, `list`/`listOne`,
`retr`, `dele`, `uidl`/`uidlOne`, `capa`, `noop`, `stls`, `quit`, plus `command`
and `commandMultiline` for anything a server supports that this does not name.
Each takes optional `ExchangeOptions`, including an `AbortSignal`, and
`upgradeTransport` swaps in a TLS transport after `STLS`.

Built on `@ac-kit/net-core`'s `Transport`, so the same client runs over TCP, TLS
or an in-memory double in a test. It imports no socket API itself.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-pop3/)
for the full reference.
