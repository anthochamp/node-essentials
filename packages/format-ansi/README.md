# @ac-kit/format-ansi

The escape sequences a terminal understands: colour, styling, cursor movement,
alternate screen, and OSC 8 hyperlinks — plus the decoder that strips them back
out again.

The hard part is not emitting `\x1b[31m`; it is emitting something the target
terminal can actually show. Ask for a truecolor value on a 16-colour terminal
and you get either garbage or nothing, so this downsamples: truecolor → 256 → 16
→ monochrome, according to a `colorDepth` you supply.

```typescript
import { hyperlink, stripAnsiEscapes, styleText } from "@ac-kit/format-ansi";

const warning = styleText("disk almost full", {
  styles: ["bold"],
  foreground: { r8: 255, g8: 170, b8: 0 },
  colorDepth: 4, // downsampled to the nearest of the 16 basic colours
});

const link = hyperlink("https://example.com", "docs");

stripAnsiEscapes(warning).length; // the visible length, for column maths
```

## What it exposes

- `styleText` — SGR styles plus foreground/background colour, downsampled to
  `colorDepth`.
- `nearestAnsi16`, `nearestAnsi256` — the downsampling on its own.
- `stripAnsiEscapes` — remove every sequence, leaving the visible text.
- `cursorUp`, `cursorDown`, `ERASE_LINE`, `CLEAR_SCREEN`, `HIDE_CURSOR`,
  `SHOW_CURSOR`, `ENTER_ALT_SCREEN`, `EXIT_ALT_SCREEN`.
- `hyperlink` — OSC 8 clickable links.
- `createAnsiEncoder`, the ANSI decoder and `AnsiToken` — for parsing a stream
  of sequences rather than producing one.

Portable: no Node.js built-ins. `@ac-kit/app-terminal`'s `styleTextFor` wraps
`styleText` to read `colorDepth` off a `Terminal` for you.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-ansi/)
for the full reference.
