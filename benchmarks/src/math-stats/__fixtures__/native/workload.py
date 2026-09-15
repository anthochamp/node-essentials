#!/usr/bin/env python3
"""Reference statistics for the cross-language group.

Usage: workload.py <noop|mean> <n> <repeat>

`noop` imports numpy and does nothing else, so the harness can price
interpreter startup plus the numpy import and subtract it. `python3 -c pass`
would understate that by a wide margin — importing numpy is most of the cost.

Values come from a multiplicative hash of the index rather than a sequential
PRNG, so numpy can build the array with two vector operations instead of a
Python loop. Otherwise the loop, not the reduction, would be what is measured.
The JavaScript side generates the identical values.

The reduction is repeated `repeat` times so that array construction is a small
fraction of the run.
"""

import sys

import numpy

KNUTH = 2654435761
TWO_32 = 4294967296


def build(count: int) -> numpy.ndarray:
    indices = numpy.arange(count, dtype=numpy.uint64)
    scrambled = (indices * numpy.uint64(KNUTH)) % numpy.uint64(TWO_32)
    return scrambled.astype(numpy.float64) / TWO_32


def main() -> int:
    mode = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    repeat = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    if mode == "noop":
        print("0")
        return 0

    if mode != "mean":
        print(f"unknown mode: {mode}", file=sys.stderr)
        return 2

    data = build(count)
    result = 0.0
    for _ in range(repeat):
        result = float(numpy.mean(data))
    print(f"{result:.12e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
