#!/usr/bin/env python3
"""Numpy reference for the sRGB -> OKLab conversion group.

Usage: workload.py <noop|oklab> <n> <repeat>

`noop` imports numpy and does nothing else, so the harness can price
interpreter startup plus the numpy import and subtract it.

The pixel formula matches `__fixtures__/pixels.ts` exactly, and the transform
is Ottosson's published linear-sRGB -> OKLab composition, which is the same
colour space the TypeScript side reaches through XYZ. Results are therefore
compared with a tolerance, not bit-for-bit.
"""

import sys

import numpy

RED_STRIDE = 7
GREEN_STRIDE = 13
BLUE_STRIDE = 29

# Ottosson (2020), linear sRGB -> LMS.
M1 = numpy.array(
    [
        [0.4122214708, 0.5363325363, 0.0514459929],
        [0.2119034982, 0.6806995451, 0.1073969566],
        [0.0883024619, 0.2817188376, 0.6299787005],
    ]
)
# cbrt(LMS) -> OKLab.
M2 = numpy.array(
    [
        [0.2104542553, 0.7936177850, -0.0040720468],
        [1.9779984951, -2.4285922050, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.8086757660],
    ]
)


def pixels(count: int) -> numpy.ndarray:
    indices = numpy.arange(count, dtype=numpy.int64)
    channels = numpy.stack(
        [
            (indices * RED_STRIDE) % 256,
            (indices * GREEN_STRIDE) % 256,
            (indices * BLUE_STRIDE) % 256,
        ],
        axis=1,
    )
    return channels.astype(numpy.uint8)


def srgb_to_linear(values: numpy.ndarray) -> numpy.ndarray:
    return numpy.where(
        values <= 0.04045,
        values / 12.92,
        ((values + 0.055) / 1.055) ** 2.4,
    )


def to_oklab(rgb8: numpy.ndarray) -> numpy.ndarray:
    linear = srgb_to_linear(rgb8.astype(numpy.float64) / 255.0)
    lms = linear @ M1.T
    return numpy.cbrt(lms) @ M2.T


def main() -> int:
    mode = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    repeat = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    if mode == "noop":
        print("0")
        return 0

    if mode != "oklab":
        print(f"unknown mode: {mode}", file=sys.stderr)
        return 2

    rgb8 = pixels(count)
    lab = to_oklab(rgb8)
    for _ in range(repeat - 1):
        lab = to_oklab(rgb8)

    # Same weighting as `labChecksum` on the TypeScript side.
    total = lab[:, 0].sum() + 3.0 * lab[:, 1].sum() + 7.0 * lab[:, 2].sum()
    print(f"{float(total):.17e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
