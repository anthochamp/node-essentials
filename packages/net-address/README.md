# @ac-kit/net-address

IPv4, IPv6, EUI-48/EUI-64 and ports — over one shared fixed-width prefix core.

All four are bit strings of a known width with several textual forms, prefix and
mask semantics, and registry-based classification. An OUI is the first 24 bits
of a MAC address exactly as `/24` is the first 24 bits of an IPv4 address, so
one value-plus-width representation carries `/32`, `/128`, `/48` and `/64`
alike, and each address kind adds only what is its own.

```ts
import {
  aggregateBitPrefixes,
  classifyIpv4Address,
  parseIpv4Address,
  parseIpv4Prefix,
  parseIpv6Address,
  printIpv4Prefix,
  printIpv6Address,
} from "@ac-kit/net-address";

classifyIpv4Address(parseIpv4Address("169.254.169.254")); // "link-local"
printIpv6Address(parseIpv6Address("2001:0DB8:0:0:0:0:2:1")); // "2001:db8::2:1"

aggregateBitPrefixes([
  parseIpv4Prefix("10.0.0.0/25"),
  parseIpv4Prefix("10.0.0.128/25"),
]).map(printIpv4Prefix); // ["10.0.0.0/24"]
```

## Parsing is strict by default

`parseIpv4Address` takes four decimal octets and nothing else. `0177.0.0.1`,
`0x7f.0.0.1`, `127.1` and `2130706433` are all rejected, and an IPv4 part
embedded in an IPv6 literal is held to the same rule.

This is a security property, not pedantry. Inconsistent IPv4 parsing is the
classic SSRF allowlist bypass: a check that reads `0177.0.0.1` as "not
127.something" hands it to a C resolver that reads it as loopback. A parser that
refuses the ambiguous forms cannot disagree with the next hop.

The legacy grammar is still available, under a name you cannot reach by
accident: `parseInetAtonIpv4Address` implements what C's `inet_aton` accepts, so
a guard can prove a hostile string resolves to a blocked address under the
lenient reading too. Never validate an allowlist with it.

The same reasoning runs through the rest of the package. `parsePort` rejects
`080`. `parseEndpoint` refuses an unbracketed IPv6 literal, because `::1:8080`
has no single reading. An all-digit host such as `2130706433` stays a *name*,
since only a resolver can say what it points at — classify what the resolver
returns, never the string.

## Printing is canonical

`printIpv6Address` produces the RFC 5952 form: lowercase, leading zeros
suppressed, the longest run of zero groups compressed to `::` — leftmost on a
tie, never for a single group — and IPv4-mapped addresses in dotted form.

`printEui` has no default notation or case, because there is no neutral choice:
IEEE Std 802 writes `00-1A-2B-3C-4D-5E` and RFC 7042 writes
`00:1a:2b:3c:4d:5e`. `EUI_PRINT_IEEE` and `EUI_PRINT_IETF` name the two.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-address/)
for the full reference.
