# @ac-kit/net-smtp

An SMTP client — the protocol for handing a message to a mail server — plus its
LMTP variant, spoken command by command rather than hidden behind a `sendMail`
facade.

That matters when you need to see what the server said: which extensions it
advertised in its `EHLO` response, which recipient it rejected and with what
code, whether it offered `STARTTLS`.

```ts
import { SmtpClient } from "@ac-kit/net-smtp";
import { DuplexTransport } from "@ac-kit/net-transport-node";

const client = new SmtpClient(new DuplexTransport(socket.stream));

await client.ehlo("client.example.com");
await client.mailFrom("sender@example.com");
await client.rcptTo("recipient@example.com");
await client.data(messageBody);
await client.quit();
```

Every command returns the server's `SmtpResponse` and takes optional
`ExchangeOptions`, including an `AbortSignal`. `upgradeTransport` swaps in a TLS
transport after `STARTTLS`. `buildSmtpMessageBody` applies dot-stuffing so a
line of a single `.` in your message cannot terminate the `DATA` block.

Built on `@ac-kit/net-core`'s `Transport`, so the same client runs over TCP, TLS
or an in-memory double in a test. It imports no socket API itself.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-smtp/)
for the full reference.
