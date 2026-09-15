# @ac-kit/model-dataset

Self-describing tabular data: a `DataFrame` of named, typed columns, plus the
vocabulary that says what each column means.

A frame carries its schema as **data** — field name, measurement scale, unit,
number format, and which direction counts as an improvement. That is what lets a
renderer decide what it can draw, or how to format a cell, without being told by
the producer.

```ts
import { dataFrameFromRows } from "@ac-kit/model-dataset";

const frame = dataFrameFromRows(
  [
    { name: "case", kind: "nominal", title: "case" },
    {
      name: "medianMs",
      kind: "quantitative",
      title: "median",
      unit: { symbol: "s", scale: -3 },
      direction: "lower-is-better",
      format: { maximumFractionDigits: 3 },
    },
  ],
  [
    ["parse", 1.204],
    ["stringify", 0.917],
  ],
);
```

## What it is for

One frame, many outputs. `@ac-kit/format-csv`, `@ac-kit/format-markdown` and
`@ac-kit/format-monospace` each render the same frame, and because formatting
comes from the field rather than from each renderer, the same number reads the
same way everywhere. `@ac-kit/model-chart` describes plots over the same shape.

## Contents

| Group       | Exports                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frame       | `DataFrame`, `FrameMeta`, `dataFrameFromRows`, `dataFrameFromColumns`, `dataFrameRow`, `dataFrameColumn`, `dataFrameField`, `dataFrameFieldIndex`, `dataFrameSelectFields`, `dataFrameWithField` |
| Incremental | `DataFrameBuilder` — append rows as they arrive, rewrite them as better answers come in                                                                                  |
| Schema      | `FieldDescriptor`, `FieldKind`, `FieldDirection`, `isNumericField`, `isCategoricalField`                                                                                 |
| Cells       | `Value`, `Column`, `columnCell`                                                                                                                                          |
| Formatting  | `createFieldFormatter`, `formatFieldValue`, `fieldTitle`, `NumberFormatSpec`                                                                                             |
| Quantities  | `Unit`, `DIMENSIONLESS`                                                                                                                                                  |
| Geometry    | `Geometry` and its GeoJSON (RFC 7946) members                                                                                                                            |

## Columnar, with row-shaped entry points

Storage is one array per field, because that is how the data is read — a chart
scans one field end-to-end to find its domain — and because a complete numeric
column can then be a `Float64Array` rather than a boxed array.

Rows are still how data is written: `dataFrameFromRows` for a one-shot build,
`DataFrameBuilder` for the incremental case, `dataFrameRow` to read one back.
There is only ever one representation; the row-shaped API is a view onto it.

A producer that computes a whole series at a time rather than a record at a time
reaches for `dataFrameFromColumns` instead, which stores the arrays it is given
by reference. Sampled data arrives that way, and routing it through the
row-major path would box every value only to transpose it back.

Only `DataFrameBuilder.build()` packs complete numeric columns into a typed
array — it owns its values and knows when they are final. `dataFrameFromRows`
stores what it was given.

## No `interval` field kind

A span is two fields — `binStart`/`binEnd`, `startedAt`/`endedAt`,
`medianLowMs`/`medianHighMs` — bound together by an `x`/`x2` encoding in
`@ac-kit/model-chart`. That keeps every column scalar, and therefore
typed-array-capable, and means a histogram, a Gantt row and a confidence band
need no special container.

## Direction belongs to the field, not the unit

`latencyMs` and `batteryLifeMs` share a unit and disagree about which way is
better, so `direction` sits on `FieldDescriptor`. `Unit` is a dimension and a
scale, nothing more.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/model-dataset/)
for the full reference.
