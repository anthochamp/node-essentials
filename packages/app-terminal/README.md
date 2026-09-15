# @ac-kit/app-terminal

What a renderer needs to know about the terminal it is drawing to — as a value
it is handed, not as a global it reads.

That distinction is what makes terminal output testable. A renderer that checks
`process.stdout.isTTY` and `process.stdout.columns` can only be exercised under
a real pty; one that takes a `Terminal` can be driven with a plain object and
asserted on.

```typescript
import { createLiveRegion, glyphFor, styleTextFor } from "@ac-kit/app-terminal";
import { nodeTerminal } from "@ac-kit/app-system";

const terminal = nodeTerminal(process.stdout);

const tick = glyphFor(terminal, "success"); // "✔", or an ASCII fallback
const heading = styleTextFor(terminal, "Results", { styles: ["bold"] });

const region = createLiveRegion(terminal);
process.stdout.write(region(["building…"]));
process.stdout.write(region([`${tick} done`]));
```

`glyphFor` and `styleTextFor` degrade with the terminal: no Unicode means an
ASCII glyph, and a non-interactive terminal means no escape sequences at all, so
the same code produces sensible output when piped to a file. A `LiveRegion`
_returns_ the string to write rather than writing it, so the caller keeps
control of the stream.

## What it exposes

- `Terminal` — interactivity, `columns`/`rows`, `colorDepth`, `unicode`,
  `hyperlinks`, a `resize` event, and optional alt-screen entry/exit.
- `createLiveRegion`, `isRedrawable`, `liveRegionHeight` — redrawing a block of
  lines in place, clamped to the viewport so scrollback is never corrupted.
- `glyphFor` and `GlyphRole` — the right character for a role, given the
  terminal's Unicode support.
- `styleTextFor` and the semantic palette — `@ac-kit/format-ansi` styling that
  reads `colorDepth` off the `Terminal` rather than taking it as an argument.

The Node adapter, `nodeTerminal`, lives in `@ac-kit/app-system`, so this package
itself stays portable.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-terminal/)
for the full reference.
