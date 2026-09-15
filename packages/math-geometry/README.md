# @ac-kit/math-geometry

Computational geometry in 2D, 3D and 4D: shapes, coordinate systems, angles, and
the predicates and constructions over them.

## Scope

Objects defined by a boundary or an extent — points, rectangles, circles,
polygons, planes, meshes — and the conversions between the coordinate systems
they are expressed in.

Curves parameterised by a scalar belong in `@ac-kit/math-curves`; discrete
integer lattices belong in `@ac-kit/math-grid`.

## Contents

| Group       | Types                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| 2D shapes   | `Point2`, `Rect2`, `Circle2`, `Line2`, `Segment2`, `Ray2`, `Triangle2`, `Polygon2`                   |
| 3D shapes   | `Point3`, `Box3`, `Sphere3`, `Line3`, `Segment3`, `Ray3`, `Plane3`, `Triangle3`, `Polygon3`, `Mesh3` |
| 4D          | `Point4`, `Box4`                                                                                     |
| Sizes       | `Size2`, `Size3`, `Size4` — including `scaleToFit` and `scaleToFill`                                 |
| Coordinates | Polar, spherical and cylindrical systems, and the conversions to and from Cartesian                  |
| Angles      | `EulerAngles`, `EulerOrder`, wrapping, normalisation, angular distance and interpolation             |

## Equality and tolerance

`*Equals` is always **exact**. It is transitive, so it is safe as a `Set` or
`Map` key and as a dedupe basis, and it agrees with the matching
`*CompareLexicographic` — `compare(a, b) === 0` exactly when `equals(a, b)`. The
tolerant counterpart is `*IsClose`, which is deliberately a different name
because it is _not_ an equality: `a ≈ b` and `b ≈ c` does not give `a ≈ c`, so
it must never back an ordering or a container.

Which tolerance a predicate takes depends on what it asks:

- **Solid predicates** — `circle2ContainsPoint`, `circle2Intersects` — are exact
  and take no tolerance. The boundary is measure-zero, so an epsilon would only
  move it by an arbitrary amount. For deliberate slack, inflate the shape:
  `circle2ContainsPoint({ ...c, radius: c.radius + margin }, p)`. That is a
  length; an epsilon on the squared distance actually compared is not.
- **Incidence predicates** — `plane3ContainsPoint`, `line2ContainsPoint` — take
  a **linear** tolerance, a distance in your own units. Exact would be useless:
  a constructed point never lands exactly on a plane.
- **Degeneracy guards** — `line2Intersect`, `segment2Intersect`,
  `ray3IntersectPlane` — take an **angular** tolerance. It is dimensionless and
  compared against a quantity already scaled by the operands' magnitudes, so
  rescaling an input never changes the verdict.

Each accepts its tolerance as a final argument and otherwise falls back to
`geometryConfig`:

```ts
import { geometryConfig, plane3ContainsPoint } from "@ac-kit/math-geometry";

// Per call
plane3ContainsPoint(plane, point, 1e-6);

// Or globally, if you work in millimetres rather than metres
geometryConfig.defaultLinearTolerance = 1e-6;
```

The two defaults are separate because the quantities are — the same split CAD
kernels make between OpenCASCADE's `Precision::Confusion()` and
`Precision::Angular()`. `geometryConfig` is process-global and mutable, so two
libraries sharing a process cannot disagree; pass a tolerance explicitly
wherever that matters.

## Point versus vector

`Point2` and `Vec2` have the same representation and different meaning: a point
is a position, a vector is a displacement. Subtracting two points yields a
vector; adding a vector to a point yields a point; adding two points is not
meaningful. The distinction is carried in the type names so that call sites read
correctly, even though no runtime check enforces it.

## Angles

Angles are radians throughout. `DEG_TO_RAD` and `RAD_TO_DEG` from
`@ac-kit/math-scalar` convert at the boundary; nothing inside the package
accepts degrees, since a mixed convention is the single most common source of
geometry bugs.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-geometry/)
for the full reference.
