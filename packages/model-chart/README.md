# @ac-kit/model-chart

A description of a chart, independent of the medium it will be drawn in.

A spec says **what to show** — encode this field on the x axis, colour by that
one, bin the third — and never how big, what colour, or at what resolution. A
renderer decides all of that, which is what lets one spec drive an SVG canvas
and an eighty-column terminal.

```ts
import type { PlotSpec } from "@ac-kit/model-chart";

const barChart: PlotSpec = {
  mark: "bar",
  encoding: {
    x: { field: "case" },
    y: { field: "medianMs", scale: { zero: true } },
  },
  description: "Median duration per case.",
};
```

## Marks and channels, not chart types

There is no `"heatmap"` type. A heatmap is `mark: "rect"` with categorical `x`
and `y` and quantitative `color`; a histogram is `mark: "bar"` with a `bin`
transform; a Gantt row is `mark: "bar"` with `x` and `x2` on a time axis. Naming
the primitive rather than the picture is what keeps the catalogue open: a chart
nobody anticipated is a combination of marks and channels that already exist,
not a new type someone has to add.

## Contents

| Group       | Exports                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Marks       | `Mark`                                                                                           |
| Channels    | `Channel`, `POSITION_CHANNELS`                                                                   |
| Encoding    | `EncodingSpec`, `FieldEncoding`, `ValueEncoding`, `AxisSpec`, `LegendSpec`, `isFieldEncoding`    |
| Scales      | `ScaleSpec`, `ScaleKind`, `ColorSchemeSpec`                                                      |
| Transforms  | `TransformSpec` and its ten members (`bin`, `aggregate`, `stack`, `density`, …)                  |
| Coordinates | `CoordSpec`, `CoordKind`, `ProjectionSpec`, `ProjectionKind`, `HierarchyLayout`, `NetworkLayout` |
| Composition | `PlotSpec`, `ViewSpec`, `LayerSpec`, `FacetSpec`, `ConcatSpec`, `Interpolation`                  |
| Annotations | `AnnotationSpec`                                                                                 |
| Rendering   | `RendererCapabilities`, `canRender`, `resolvePlot`, `unsupportedFeatures`                        |

## Nothing here is in output units

No width, height, margin, pixel, cell, font or colour literal appears anywhere
in these types. A scale declares a **domain** and never a range; a colour scale
names a **scheme** and never a hex value, so a terminal with no colour can map
it to a glyph ramp. Anything expressed in output units would make a spec
renderable by exactly one adapter.

Binning follows the same rule: it is declared, never pre-applied. A frame that
already carries buckets cannot be re-fitted, and an eighty-column terminal, a
1200 px canvas and an eight-cell sparkline each want a different bucket count.

## Declining gracefully

A renderer declares what it can draw as `RendererCapabilities`; `resolvePlot`
walks a spec's `fallback` chain and returns the first drawable one. A `null`
result is the signal to apply the universal fallback and render the underlying
frame as a table. Every spec carries a `description` so a renderer that declines
still has something to say.

## Transforms are declared here, computed elsewhere

`bin`, `density`, `regression` and `contour` are named operations with real
implementations, and those belong where the mathematics lives —
`@ac-kit/math-stats`, `@ac-kit/math-grid`, `@ac-kit/algo`. This package says
which one to apply, not how.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/model-chart/)
for the full reference.
