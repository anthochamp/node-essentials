# node-essentials

`@ac-kit` is a family of small, focused TypeScript libraries: language
extensions, data structures, numeric domains, cryptography, data formats,
network protocols and application helpers. Every package is ESM-only, strictly
typed, and independently installable — take the one you need without dragging in
the rest.

Most of the tree is **portable**: no `node:` imports, no native bindings, so it
runs unchanged in Node, browsers, Deno, Bun and edge runtimes. Where a Web API
covers the job (`TransformStream`, `TextDecoder`, `crypto.getRandomValues`), it
is used instead of the Node built-in. Packages that genuinely need system access
— sockets, filesystem, processes, terminals — are marked host-bound and kept
separate, so a portable package can never pull one in.

## Packages

| family                       | what it covers                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `core`, `node`               | language and standard-library extensions; the host-bound counterpart                                                          |
| `algo`, `data`               | general algorithms; generic collections (list, queue, deque, stack, heap, priority queue)                                     |
| `async`                      | channels, broadcasts, locks, semaphores and other coordination primitives                                                     |
| `math-*`                     | numeric domains — scalar, integer, algebra, complex, linear, random, stats, geometry, signal, colour, …                       |
| `format-*`                   | parsers and printers — JSON family, YAML, TOML, INI, CSV, CBOR, ASN.1, HTTP, glob, regex, cron, Markdown, PO, EditorConfig, … |
| `crypto-*`, `noncrypto-hash` | cryptographic primitives (hash, MAC, random, constant-time) and non-cryptographic digests                                     |
| `net-*`                      | protocol implementations — HTTP, IMAP, POP3, SMTP, socketmap — over a pluggable transport                                     |
| `app-*`                      | application building blocks — configuration, logging, reporting, terminal, i18n, system                                       |
| `cmd-*`                      | typed wrappers over independently installed programs (`git`, `docker`)                                                        |

Each package has its own `README.md` with its API and usage. Published API
documentation is generated per package.

## Install

```sh
npm install @ac-kit/core
```

Node.js: the version in [`.nvmrc`](.nvmrc). Packages are ESM-only — there is no
CommonJS build and none is planned.
