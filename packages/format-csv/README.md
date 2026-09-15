# @ac-kit/format-csv

Renders a `@ac-kit/model-dataset` `DataFrame` as RFC 4180 CSV, and parses CSV
text back into rows of strings.

CSV has no type system: every field is text, and the only structure is the
quoting rule that lets a field contain a comma, a quote or a newline. That rule
is what this implements — correctly, in both directions — so a frame written
here reads back in a spreadsheet, and a file written by one reads back here.

```ts
import { parseCsv, renderFrameAsCsv, stringifyCsv } from "@ac-kit/format-csv";

const rows = parseCsv('name,note\n"Smith, J.","said ""hi"""\n');
// [["name", "note"], ["Smith, J.", 'said "hi"']]

stringifyCsv(rows);
renderFrameAsCsv(frame);
```

`CsvParseStream` and `CsvPrintStream` are `TransformStream`s for files too large
to hold as a string; `CsvRowDecoder` and `createCsvRowEncoder` are the
row-at-a-time codecs beneath them.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-csv/)
for the full reference.
