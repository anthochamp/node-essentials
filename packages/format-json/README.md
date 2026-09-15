# @ac-kit/format-json

JSON, with the two things `JSON.parse`/`JSON.stringify` do not give you:
streaming, and editing a document without reformatting the whole of it.

```ts
import { editJson, JsonParseStream, parseJson, printJson } from "@ac-kit/format-json";

parseJson('{"port":8080}');
printJson({ port: 8080 }, { indent: 2 });

// Change one value, leaving the rest of the source as it was.
editJson(source, ["server", "port"], 9090);

// Parse a document too large to hold as a string.
const values = response.body.pipeThrough(new JsonParseStream());
```

`JsonParseStream` and `JsonPrintStream` are `TransformStream`s over
`@ac-kit/format-core`, so they compose with any Web Streams pipeline.
`createJsonEdits` returns the `TextEdit`s rather than applying them, for a
caller driving an editor.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-json/)
for the full reference.
