# @ac-kit/math-color

Colour science: colour models, colour spaces, conversions between them, gamut
mapping and perceptual analysis.

Two colours that differ by the same amount in RGB do not look equally different
to a human eye — which is why "average these two colours" and "pick a readable
text colour" both give wrong answers in RGB. Perceptual spaces like Oklab exist
so that distance in the space matches difference to the eye, and that is what
most of this package is for.

```ts
import { deltaE2000, oklabToRgb8, rgb8ToOklab, wcagContrastRatio } from "@ac-kit/math-color";

const brand = { r8: 0x33, g8: 0x66, b8: 0xcc };

// Is white text legible on it? WCAG AA wants 4.5 for body text.
wcagContrastRatio({ r8: 255, g8: 255, b8: 255 }, brand);

// Lighten perceptually, not by scaling channels.
const lab = rgb8ToOklab(brand);
const lighter = oklabToRgb8({ ...lab, L: lab.L + 0.1 });
```

## Scope

Colour as a measurable quantity rather than a triple of bytes. Every conversion
here is defined against a white point and a transfer function, and the type
system records which space a value is in.

## Contents

| Group       | Contents                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Models      | `RgbCoords`, `HslCoords`, `LabCoords`, `LchCoords`, `XyzCoords`, `XyY`                                         |
| Spaces      | `Srgb`, `SrgbLinear`, `DisplayP3`, `DisplayP3Linear`, `Oklab`, `Oklch`, `LabD50`, `LabD65`, `LchD50`, `LchD65` |
| Illuminants | Standard white points and chromatic adaptation                                                                 |
| Gamut       | `labIsInRgbGamut`, `labMapToRgbGamut`                                                                          |
| Analysis    | `oklabPalette`, `oklabToneAnalysis`                                                                            |
| Encoding    | Hex, CSS colour syntax, named colours                                                                          |

## Spaces are phantom-typed

A colour space is carried in the type, not merely in a comment. `RgbCoords` in
sRGB and `RgbCoords` in Display P3 are the same three numbers and entirely
different colours; the brand prevents passing one where the other is expected.
It also forces the conversion to be explicit, which is where the transfer
function and the white point actually get applied.

## Why Oklab

Palette extraction and tone analysis work in Oklab rather than in sRGB or CIELAB
because Euclidean distance in Oklab approximates perceived difference much more
closely. Clustering in sRGB weights the green channel far too heavily and
produces palettes that look wrong; CIELAB is better but has a well-known hue
shift in the blues. Oklab was fitted specifically to correct both.

Gamut mapping likewise happens in a perceptual space: reducing chroma while
holding lightness and hue produces a colour a viewer recognises as the same one,
where naive per-channel clipping shifts the hue.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-color/)
for the full reference.
