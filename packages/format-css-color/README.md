# @ac-kit/format-css-color

Parse, serialise and evaluate the CSS `<color>` production.

Every notation CSS Color 4 defines — hex, the `rgb()`/`hsl()`/`hwb()` family,
`lab()`/`lch()`/`oklab()`/`oklch()`, `color()` over six colour spaces,
`color-mix()`, relative colour syntax, the 148 colour keywords, `transparent`
and `currentColor`.

## Install

```sh
npm install @ac-kit/format-css-color
```

## Usage

Parsing keeps what was written; evaluating is a separate step, because a linter
and a renderer want different answers.

```ts
import {
  parseCssColor,
  printCssColor,
  resolveCssColor,
  toHex,
} from "@ac-kit/format-css-color";

const color = parseCssColor("oklch(70% 0.15 250deg)");

printCssColor(color); // "oklch(70% 0.15 250deg)" — round-trips the source
toHex(resolveCssColor(color)); // "#4f8fd4"
```

`tryParseCssColor` returns `null` instead of throwing, for validating input
where a failed parse is an expected outcome rather than an error.

```ts
import { tryParseCssColor } from "@ac-kit/format-css-color";

tryParseCssColor("#bad-input"); // null
```

Relative colour syntax reads channels of an origin colour, in the units the
surrounding notation uses:

```ts
toHex(resolveCssColor(parseCssColor("rgb(from #ff8000 0 g b)"))); // "#008000"
```

`currentColor` has no value outside a cascade, so resolving it needs a
substitute:

```ts
resolveCssColor(parseCssColor("currentColor"), {
  currentColor: { r: 1, g: 0, b: 0, alpha: 1 },
});
```

## Display names

A keyword is an identifier, not something to show a reader — `mediumvioletred`
is a token. Labels live under a per-locale subpath, so importing one language
never pulls in the rest:

```ts
import { cssColorLabel } from "@ac-kit/format-css-color";
import { CSS_COLOR_LABELS } from "@ac-kit/format-css-color/names/fr";

cssColorLabel(CSS_COLOR_LABELS, "aliceblue"); // "Bleu Alice"
cssColorLabel(CSS_COLOR_LABELS, "aqua"); // "Cyan" — aliases are followed
cssColorLabel(CSS_COLOR_LABELS, "unknown"); // "unknown" — never empty
```

Every locale module exports the same two names, `LOCALE` and `CSS_COLOR_LABELS`,
so a dynamic import works without knowing the language up front:

```ts
const { CSS_COLOR_LABELS } = await import(
  `@ac-kit/format-css-color/names/${locale}`
);
```

French is the only language shipped so far. No canonical multilingual dataset of
colour names exists, so each one is a translation rather than an import.

## Notes

- Colour values are `@ac-kit/math-color` types; this package owns the syntax,
  not the colour science.
- `calc()` inside a component is not accepted. It is a CSS value-level grammar
  rather than part of `<color>`, and belongs to a package that owns arithmetic
  over any property.
- `color-mix()` interpolates in OKLab whatever space the keyword names. That
  agrees closely for the rectangular spaces and differs for the polar ones by
  taking the shortest hue arc.
- Resolving clamps into sRGB rather than gamut-mapping. Map with
  `@ac-kit/math-color` first when that matters.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-css-color/)
for the full reference.
