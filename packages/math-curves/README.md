# @ac-kit/math-curves

Parametric curves: Bézier segments, splines, and the operations that make them
usable — evaluation, subdivision, arc length, closest point.

## Scope

A curve is a map from a scalar parameter to a point. That is the boundary of
this package: anything parameterised by `t` belongs here, anything defined by a
boundary or an area belongs in `@ac-kit/math-geometry`.

Points are the `Vec2` and `Vec3` tuples from `@ac-kit/math-linear`.

## Contents

| Symbol                            | Description                             |
| --------------------------------- | --------------------------------------- |
| `quadraticBezier2(p0, p1, p2, t)` | Quadratic Bézier in the Bernstein basis |
| `cubicBezier2(p0, p1, p2, p3, t)` | Cubic Bézier in the Bernstein basis     |

## Parameter is not arc length

A Bézier evaluated at evenly spaced `t` does not produce evenly spaced points.
The parameter advances uniformly in the control polygon's basis, not along the
curve, so a segment with distant control points traverses faster in its middle.
Anything that animates along a curve, or spaces dashes on it, needs an arc
length reparameterisation rather than the raw parameter.

## Usage

```ts
import { cubicBezier2 } from "@ac-kit/math-curves";

cubicBezier2([0, 0], [0, 1], [1, 1], [1, 0], 0.5); // [0.5, 0.75]
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-curves/)
for the full reference.
