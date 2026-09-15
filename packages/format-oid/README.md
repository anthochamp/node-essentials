# @ac-kit/format-oid

An OID (object identifier) type and registry — the dotted `1.2.840.113549`
numbers that name algorithms, certificate attributes and SNMP objects.

An OID is a path through a globally registered tree, so the two things anyone
needs are a representation that round-trips exactly and a way to get from the
numbers to a name a human recognises. This provides both, and is shared by
`@ac-kit/format-asn1`, where OIDs are a built-in type.

```ts
import { oidFromDotted, oidToDotted, wellKnownOidRegistry } from "@ac-kit/format-oid";

const oid = oidFromDotted("1.2.840.113549.1.1.11");
oidToDotted(oid); // "1.2.840.113549.1.1.11"

// The registered name, or the dotted string when it is not a known OID.
wellKnownOidRegistry.formatName(oid);
```

Also exposes `oidEqual`, `oidStartsWith`, `oidAppend`, `oidRelative`, the
relative-OID pair, `validateOid`, `wellKnownRootArcs`, and `OidRegistry` with
`register` / `lookup` / `lookupByName` for registering your own names.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-oid/)
for the full reference.
