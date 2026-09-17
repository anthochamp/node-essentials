---
"@ac-kit/net-address": minor
---

New package: IPv4, IPv6, EUI-48/EUI-64 and ports over one shared fixed-width
prefix core.

All four are bit strings of a known width with several textual forms, prefix and
mask semantics, and registry-based classification — an OUI is the first 24 bits
of a MAC address exactly as `/24` is the first 24 bits of an IPv4 address. One
value-plus-width representation therefore carries `/32`, `/128`, `/48` and
`/64` alike, and each address kind adds only its own syntax and its own
registry. That shared core is what makes this one package rather than three.

`BitAddress` is `{ value: bigint; bitWidth: number }`: an address is an unsigned
integer of a width it cannot supply itself, so `255.255.255.255` is
`4294967295n` and never `-1n`. `bitAddressFromBytes` and `bitAddressToBytes` are
the octet boundary, for wire formats and anything else that speaks bytes.

Parsing is strict by default, and that is a security property rather than
pedantry. `0177.0.0.1`, `0x7f.0.0.1`, `127.1` and `2130706433` are all rejected
by `parseIpv4Address`, including where they hide inside an IPv6 literal, because
inconsistent IPv4 parsing is how an SSRF allowlist gets bypassed: a check that
reads one of those as "not 127.something" hands it to a resolver that reads it
as loopback. The legacy `inet_aton` grammar is still reachable, under a name
nobody arrives at by accident, so a guard can also prove what a hostile string
would resolve to under the lenient reading.

`getRandomEphemeralPort`, `EPHEMERAL_PORT_MIN_VALUE` and
`EPHEMERAL_PORT_MAX_VALUE` move here from `@ac-kit/core`, beside the rest of the
RFC 6335 port semantics.

Depends on `@ac-kit/math-numbers` for the fixed-width integer arithmetic behind
the prefix core.
