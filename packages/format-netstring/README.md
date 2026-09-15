# @ac-kit/format-netstring

Netstring framing (`<length>:<data>,`): a `Decoder`, an `Encoder`, the codec
pairing them, and `TransformStream`s over both.

```ts
import {
  createNetstringCodec,
  encodeNetstring,
  NetstringDecodeStream,
} from "@ac-kit/format-netstring";

encodeNetstring("hello"); // 5:hello,
```

A netstring announces its own length before sending any of it, so
`maxPayloadLength` (1 MiB by default) is checked against the declaration rather
than against bytes received: a hostile `999999999999:` is rejected immediately
instead of after the receive buffer fills.

A length-field violation is recoverable — the decoder knows exactly how many
bytes to discard, so framing resynchronises at the next frame. A missing comma
terminator is fatal: the declared length pointed somewhere it should not have,
so the length itself cannot be trusted and there is no position to resynchronise
from.

Spec: <https://cr.yp.to/proto/netstrings.txt\>

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-netstring/)
for the full reference.
