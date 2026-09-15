import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { HeapStorage } from "./iheap-storage.js";

/**
 * The binary-heap array arithmetic and heapify operations, shared by
 * `BinaryHeap` and `PriorityQueue` — both are an array-backed binary heap,
 * differing only in what `precedes` compares (the element itself, versus an
 * entry's priority).
 */

/** @returns The parent index of `index`. `-1` when `index` is the root (`0`). */
function getParentIndex_(index: number): number {
	return Math.floor((index - 1) / 2);
}

function getLeftChildIndex_(index: number): number {
	return 2 * index + 1;
}

function getRightChildIndex_(index: number): number {
	return 2 * index + 2;
}

/** Restores the heap property by moving the item at `index` up. */
export function heapifyUp<T extends DefinedValue>(
	storage: HeapStorage<T>,
	index: number,
	precedes: OrderPredicate<T>,
): void {
	let currentIndex = index;
	while (currentIndex > 0) {
		const parentIndex = getParentIndex_(currentIndex);
		const current = storage.get(currentIndex);
		const parent = storage.get(parentIndex);

		if (
			parent !== undefined &&
			current !== undefined &&
			!precedes(parent, current)
		) {
			storage.set(currentIndex, parent);
			storage.set(parentIndex, current);
			currentIndex = parentIndex;
		} else {
			break;
		}
	}
}

/**
 * Restores the heap property by moving the item at `index` down, over the first
 * `count` slots.
 */
export function heapifyDown<T extends DefinedValue>(
	storage: HeapStorage<T>,
	index: number,
	count: number,
	precedes: OrderPredicate<T>,
): void {
	let currentIndex = index;
	let current = storage.get(currentIndex);

	let leftChildIndex = getLeftChildIndex_(currentIndex);
	while (current !== undefined && leftChildIndex < count) {
		let candidateIndex = currentIndex;
		let candidate = current;

		const leftChild = storage.get(leftChildIndex);
		if (leftChild !== undefined && !precedes(candidate, leftChild)) {
			candidateIndex = leftChildIndex;
			candidate = leftChild;
		}

		const rightChildIndex = getRightChildIndex_(currentIndex);
		const rightChild =
			rightChildIndex < count ? storage.get(rightChildIndex) : undefined;
		if (rightChild !== undefined && !precedes(candidate, rightChild)) {
			candidateIndex = rightChildIndex;
			candidate = rightChild;
		}

		if (candidateIndex === currentIndex) {
			break;
		}

		storage.set(currentIndex, candidate);
		storage.set(candidateIndex, current);

		currentIndex = candidateIndex;
		current = storage.get(currentIndex);

		leftChildIndex = getLeftChildIndex_(currentIndex);
	}
}

/** Heapifies the entire storage, from the last parent up to the root. */
export function heapifyAll<T extends DefinedValue>(
	storage: HeapStorage<T>,
	precedes: OrderPredicate<T>,
): void {
	for (let i = Math.floor(storage.count() / 2) - 1; i >= 0; i--) {
		heapifyDown(storage, i, storage.count(), precedes);
	}
}
