# @ac-bench/reporter-table

The live terminal table for a benchmark run: a spinner and a partially-filled
table while cases are still being measured, then the finished table committed to
scrollback once each condition ends, then a recap of every warning and load
error at the end.

Degrades to plain sequential writes when the terminal is not interactive, so a
CI log reads as a series of finished tables rather than a stream of cursor
movements.

```ts
import { defineConfig } from "@ac-bench/cli";
import tableReporter from "@ac-bench/reporter-table";

export default defineConfig({
  plugins: [tableReporter],
  reporters: ["table"],
});
```

The default export is the reporter plugin itself, not a factory: a table writes
to the run's own output stream and has nothing to configure.

`@ac-bench/cli` already depends on this package and selects it by id, so listing
it in `plugins` is only necessary when something else needs the plugin value
itself.

## Colour

A row's colour comes from how far its ratio column sits from `1`, on a
logarithmic scale anchored there. Half as fast and twice as fast are the same
distance from the anchor, and it maps the value rather than the rank — three
cases within a percent of each other come out the same colour instead of being
spread across the whole ramp just because there are three of them. The far end
of the scale is the worst case present, so the table recolours as rows arrive.

The colour lands on the ratio column and whatever column that one declares as
its `uncertaintyField`. Raw quantities are left alone: they are what the ranking
is computed from, but a reader compares runs by the ratio, and tinting a column
of milliseconds says nothing to act on. The winner's ranked quantity is bolded
instead.

Rows whose numbers are not settled yet are dimmed rather than coloured, a frame
where every case sits at the anchor is left uncoloured entirely, and a measure
declaring no `ratioField` gets no colour at all.
