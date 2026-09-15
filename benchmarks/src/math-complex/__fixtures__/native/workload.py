#!/usr/bin/env python3
"""Numpy reference for the complex-arithmetic groups.

Usage: workload.py <noop|multiply|fft> <n> <repeat>

`noop` imports numpy and does nothing else, so the harness can price
interpreter startup plus the numpy import and subtract it. `python3 -c pass`
would understate that badly — importing numpy is most of the cost.

Values come from the same dyadic formula the TypeScript side uses, built with
vector operations rather than a Python loop so that construction is not what
gets measured. They are multiples of 1/4 bounded by 1.75, which keeps every
product and sum of a complex multiply exactly representable; `multiply` can
therefore be compared bit-for-bit against the JavaScript contenders.

`fft` is not exact — twiddle factors are transcendental — so that mode is
compared to a tolerance instead.
"""

import sys

import numpy

A_REAL_PHASE = 37
A_IMAGINARY_PHASE = 53
B_REAL_PHASE = 29
B_IMAGINARY_PHASE = 41


def component(count: int, phase: int) -> numpy.ndarray:
    indices = numpy.arange(1, count + 1, dtype=numpy.int64)
    return ((indices * phase) % 8).astype(numpy.float64) / 4.0


def operands(count: int) -> tuple[numpy.ndarray, numpy.ndarray]:
    a = component(count, A_REAL_PHASE) + 1j * component(count, A_IMAGINARY_PHASE)
    b = component(count, B_REAL_PHASE) + 1j * component(count, B_IMAGINARY_PHASE)
    return a, b


def main() -> int:
    mode = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    repeat = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    if mode == "noop":
        print("0")
        return 0

    if mode == "multiply":
        a, b = operands(count)
        out = numpy.empty_like(a)
        for _ in range(repeat):
            numpy.multiply(a, b, out=out)
        # Same weighting as `productChecksum` on the TypeScript side.
        print(f"{float(out.real.sum() + 3.0 * out.imag.sum()):.17e}")
        return 0

    if mode == "fft":
        a, _unused = operands(count)
        out = a
        for _ in range(repeat):
            out = numpy.fft.fft(a)
        print(f"{float(numpy.abs(out).sum()):.17e}")
        return 0

    print(f"unknown mode: {mode}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
