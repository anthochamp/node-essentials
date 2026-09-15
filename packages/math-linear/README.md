# @ac-kit/math-linear

Linear algebra over IEEE 754 binary64: vectors, matrices and quaternions of
fixed, small dimension.

## Scope

The fixed-dimension types that 2D and 3D work needs — `Vec2`/`Vec3`/`Vec4`,
`Mat2x2`/`Mat3x3`/`Mat4x4`, `Quaternion` — represented as plain tuples and
operated on by free functions.

Dimension is part of the type, not a runtime property. That is what makes the
operations inlineable and allocation-predictable, and it is why an arbitrary
`Matrix<n, m>` is a different design rather than a generalisation of this one.

## Contents

| Module                       | Contents                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `vec2`, `vec3`, `vec4`       | Component-wise arithmetic, dot, cross, length, normalisation, interpolation, matrix application    |
| `mat2x2`, `mat3x3`, `mat4x4` | Multiplication, determinant, inverse, transpose, transform construction                            |
| `quaternion`                 | Rotation composition, slerp, conversion to and from axis-angle, Euler angles and rotation matrices |

## Equality and tolerance

`*Equals` is **exact**, component by component. It is transitive, so it is safe
as a `Set` or `Map` key and as a dedupe basis. `*IsClose` is the tolerant
counterpart and is deliberately named differently, because it is _not_ an
equality: `a ≈ b` and `b ≈ c` does not give `a ≈ c`, so it must never back an
ordering or a container.

`*IsClose` requires its tolerance — there is no default and no global config,
unlike `@ac-kit/math-geometry`. A vector or matrix here is dimensionless algebra
with no units of its own, so only the caller knows what counts as close:

```ts
import { vec3IsClose } from "@ac-kit/math-linear";

vec3IsClose(a, b, { absTol: 1e-9 }); // values near the origin
vec3IsClose(a, b, { relTol: 1e-9 }); // values of unknown magnitude
vec3IsClose(a, b, { relTol: 1e-9, absTol: 1e-12 }); // both, whichever is looser
```

`quaternionEquals` and `quaternionIsClose` compare the four components, so `q`
and `-q` are neither equal nor close even though they denote the same rotation.
Compare `Math.abs(quaternionDot(q1, q2))` against `1` to test the rotations
instead.

## Quaternion here versus quaternion in math-numbers

The `Quaternion` in this package is a rotation operator: four floats, always
used unit-length, optimised for composing and interpolating orientations.

`@ac-kit/math-complex`'s `QuaternionNum` is ℍ as an algebraic object — a
division ring implementing the `@ac-kit/math-algebra` hierarchy. Same
mathematics, different purpose; neither is a substitute for the other.

## Usage

```ts
import { vec3Cross, vec3Normalize } from "@ac-kit/math-linear";

vec3Normalize(vec3Cross([1, 0, 0], [0, 1, 0])); // [0, 0, 1]
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-linear/)
for the full reference.
