# @ac-kit/format-po

GNU gettext PO and POT files: parse, print, and evaluate plural rules.

A PO file is the interchange format every translation tool speaks — `xgettext`
writes it, translators edit it, `msgmerge` updates it. This package reads one
into a list of entries you can inspect and write back without losing a comment,
a reference, or an obsolete message.

## Install

```sh
npm install @ac-kit/format-po
```

## Parsing and printing

```ts
import { parsePo, printPo } from "@ac-kit/format-po";

const entries = parsePo(source);
// [{
//   translatorComments: ["Translator note"],
//   extractedComments: ["Shown on the login screen"],
//   references: [{ file: "src/login.ts", line: 42 }],
//   flags: ["fuzzy", "c-format"],
//   previous: { context: null, id: "Hello %s", idPlural: null },
//   context: null,
//   id: "Hi %s",
//   idPlural: null,
//   strings: ["Salut %s"],
//   obsolete: false,
// }, …]

printPo(entries); // back to a PO file
```

Everything survives the round trip: `#` translator comments, `#.` extracted
comments, `#:` references, `#,` flags, the `#|` previous-value block, `msgctxt`,
plural forms, and `#~` obsolete entries. The header is not special-cased — it is
simply the entry whose `id` is empty.

Long lines are not wrapped. Wrapping is cosmetic and awkward to reproduce
byte-for-byte, so anyone who needs output identical to gettext's should pipe
through `msgcat`.

`parsePo` throws `PoSyntaxError`, which carries the line it gave up on.

Streaming counterparts are available for pipelines:

```ts
import { PoParseStream, PoPrintStream } from "@ac-kit/format-po";

const entries = await ReadableStream.from(bytes)
  .pipeThrough(new PoParseStream())
  .getReader()
  .read();
```

Both buffer the whole document, because a PO file's grammar has no incremental
decode point.

## The header

```ts
import { parsePoHeader } from "@ac-kit/format-po";

const header = parsePoHeader(entries);
header.get("language"); // "fr"
header.get("plural-forms"); // "nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : …);"
```

Field names are case-insensitive and come back folded to lower case.

## Plural rules

`Plural-Forms` holds a C conditional expression over one variable, `n`. It is
parsed and compiled to a closure tree — never handed to `eval` or
`new Function`, because a catalogue is external input and every library that has
taken that shortcut shipped a code-execution hole with it.

```ts
import { parsePluralForms, DEFAULT_PLURAL_FORMS } from "@ac-kit/format-po";

const plural = parsePluralForms(header.get("plural-forms") ?? "");
plural.count; // 3
plural.select(21); // 0
plural.select(2); // 1
plural.select(5); // 2

entry.strings[plural.select(count)];
```

`select` always answers within `[0, count)`; an expression that would fall
outside is clamped, so a mistranslated header cannot index past an entry's
strings. `DEFAULT_PLURAL_FORMS` is the two-form English rule gettext assumes
when the field is missing.

## Scope

This package owns the file format. Looking a message up by id and context,
choosing a catalogue for a locale, and formatting the result are a message
catalogue's job, not a parser's.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-po/)
for the full reference.
