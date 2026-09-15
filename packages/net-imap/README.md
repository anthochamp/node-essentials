# @ac-kit/net-imap

An IMAP client — the protocol for reading mail that stays on the server, in
folders, across several devices.

```ts
import { ImapClient } from "@ac-kit/net-imap";
import { DuplexTransport } from "@ac-kit/net-transport-node";

const client = new ImapClient(new DuplexTransport(socket.stream));

await client.capability();
await client.login("alice", password);
await client.select("INBOX");
const response = await client.command("FETCH 1 (BODY[])");
await client.logout();
```

IMAP tags every command and interleaves the replies, so responses do not
necessarily arrive in the order the commands were sent. The client owns that
correlation: `nextTag` issues the tags and each method resolves with its own
reply. `command` sends anything this does not name explicitly, and
`upgradeTransport` swaps in a TLS transport after `STARTTLS`.

Built on `@ac-kit/net-core`'s `Transport`, so the same client runs over TCP, TLS
or an in-memory double in a test. It imports no socket API itself.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-imap/)
for the full reference.
