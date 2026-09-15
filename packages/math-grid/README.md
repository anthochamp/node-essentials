# @ac-kit/math-grid

Discrete two-dimensional integer lattices: grid coordinates, several storage
strategies, and the packing and tiling algorithms over them.

```ts
import { BoundedGrid2 } from "@ac-kit/math-grid";

const grid = new BoundedGrid2<string>({ rows: 4, cols: 8 });

const area = { start: { row: 0, col: 0 }, span: { rows: 2, cols: 3 } };
if (grid.canPlaceRect(area)) {
  grid.placeRect(area, "widget");
}

grid.getCell({ row: 1, col: 2 }); // "widget"
```

## Scope

Geometry where positions are integers and cells are the unit of measurement —
tile maps, bin packing, layout solvers, cellular automata.

Continuous geometry lives in `@ac-kit/math-geometry`; the conversion functions
between the two are here.

## Contents

| Type            | Storage       | Bounds                        |
| --------------- | ------------- | ----------------------------- |
| `BoundedGrid2`  | Flat 1D array | Fixed rows × columns          |
| `InfiniteGrid2` | Sparse `Map`  | Unbounded in both axes        |
| `RowGrid2`      | Row-major     | Fixed rows, unbounded columns |
| `StripGrid2`    | Row-major     | Fixed columns, unbounded rows |

Plus `GridCoord2`, `GridSize2`, `GridRect2`, the pixel conversions
(`gridCoord2ToPoint2`, `gridRect2ToPixelRect2`, …), and the tiling algorithms
`findFrontierTilings` and `dfsPackGrid2`.

## Choosing a storage strategy

The four grid types exist because the access pattern, not the abstraction,
determines the cost. `BoundedGrid2` is a single contiguous array with O(1)
indexed access and no per-cell overhead — the right choice whenever the extent
is known. `InfiniteGrid2` pays a hash lookup per access but only stores occupied
cells, which wins as soon as the grid is mostly empty. `RowGrid2` and
`StripGrid2` cover the asymmetric cases: a fixed number of tracks growing in one
direction, as in a timeline or a masonry layout.

All four implement the same `Grid2` interface, so an algorithm written against
it works with any of them.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-grid/)
for the full reference.
