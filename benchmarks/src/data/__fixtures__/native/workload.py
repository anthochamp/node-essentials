#!/usr/bin/env python3
"""Reference workloads for the cross-language groups.

Usage: workload.py <noop|queue|heap> <n>

`noop` exists so the harness can price interpreter startup plus these imports
and subtract it; a bare `python3 -c pass` would understate that cost.

The checksum is printed so the caller can verify every language computed the
same answer.
"""

import sys
from collections import deque
from heapq import heappop, heappush

MASK = 0xFFFFFFFF
SEED = 0x2545F491


def xorshift32(state: int) -> int:
    state ^= (state << 13) & MASK
    state ^= state >> 17
    state ^= (state << 5) & MASK
    return state & MASK


def queue_workload(count: int) -> int:
    queue: deque[int] = deque()
    total = 0
    for index in range(count):
        queue.append(index)
        if index & 1:
            total = (total + queue.popleft()) & MASK
    while queue:
        total = (total + queue.popleft()) & MASK
    return total


def heap_workload(count: int) -> int:
    heap: list[int] = []
    state = SEED
    for _ in range(count):
        state = xorshift32(state)
        heappush(heap, state)
    total = 0
    while heap:
        total = (total + heappop(heap)) & MASK
    return total


def main() -> int:
    mode = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    if mode == "noop":
        print(0)
    elif mode == "queue":
        print(queue_workload(count))
    elif mode == "heap":
        print(heap_workload(count))
    else:
        print(f"unknown mode: {mode}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
