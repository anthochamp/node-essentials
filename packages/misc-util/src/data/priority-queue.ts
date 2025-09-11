import type {
	IPriorityQueue,
	PriorityQueueIsHigherPriorityPredicate,
} from "./abstract-types/ipriority-queue.js";
import { BinaryHeapCollection } from "./collection-base/binary-heap-collection.js";

/**
 * A priority queue implementation.
 *
 * @template T The type of elements in the priority queue.
 * @template P The type of priority associated with each element.
 */
export class PriorityQueue<T, P = number>
	extends BinaryHeapCollection<[T, P]>
	implements IPriorityQueue<T, P>
{
	constructor(
		iterable?: Iterable<[T, P]>,
		capacity?: number,
		readonly isHigherPriority: PriorityQueueIsHigherPriorityPredicate<P> = (
			a,
			b,
		) => a < b,
	) {
		super(
			(a, b) => {
				const [, ap] = a;
				const [, bp] = b;
				return isHigherPriority(ap, bp);
			},
			iterable,
			capacity,
		);
	}

	insert(priority: P, ...items: T[]): void {
		this.data.insert(...items.map<[T, P]>((item) => [item, priority]));
	}

	async waitInsert(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.data.waitInsert(
			[...items].map<[T, P]>((item) => [item, priority]),
			signal,
		);
	}

	extract(): T | undefined {
		const item = this.data.extract();
		if (item === undefined) {
			return;
		}

		return item[0];
	}

	peek(): T | undefined {
		const item = this.data.root();
		if (item === undefined) {
			return;
		}

		return item[0];
	}

	setPriority(item: T, newPriority: P): boolean {
		const replacedItems = this.data.replace(
			([v]) => v === item,
			() => [item, newPriority],
		);

		return replacedItems.next().done === false;
	}
}
