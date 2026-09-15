import type { IStorage } from "../storage/istorage.js";

/** The typed-array constructors a {@link TypedVector} can be built over. */
export type TypedArrayConstructor =
	| Int8ArrayConstructor
	| Uint8ArrayConstructor
	| Uint8ClampedArrayConstructor
	| Int16ArrayConstructor
	| Uint16ArrayConstructor
	| Int32ArrayConstructor
	| Uint32ArrayConstructor
	| Float32ArrayConstructor
	| Float64ArrayConstructor;

/** The instance type a {@link TypedArrayConstructor} produces. */
export type TypedArrayOf<C extends TypedArrayConstructor> = InstanceType<C>;

export type TypedVectorOptions = {
	/** Slots to pre-allocate. Growth still applies above it. Defaults to `8`. */
	initialCapacity?: number;
};

const MIN_PHYSICAL_LENGTH = 8;

/**
 * A growable vector over a fixed-size typed array.
 *
 * `RingVector` boxes every element into a generic `T` slot; this holds raw
 * numbers in an `Int32Array`, `Float64Array` or similar, so a million elements
 * cost a million machine words rather than a million pointers plus a million
 * heap-allocated numbers.
 *
 * **Build it for the memory, not for the speed.** What this wins is footprint
 * and cache locality on large numeric collections, which matters at a scale
 * where the per-element constant does not.
 *
 * Growth doubles the backing and copies, so `pushBack` is O(1) amortised. The
 * copy uses `TypedArray.prototype.set`, a single bulk move rather than a JS
 * loop.
 *
 * Only back-end operations are declared: a front-end insert on a flat array is
 * O(n), so `IPushFront` is deliberately absent. Use `RingVector` when both ends
 * are needed.
 *
 * @template C The typed-array constructor, e.g. `Float64Array`.
 */
export class TypedVector<
	C extends TypedArrayConstructor,
> implements IStorage<number> {
	private data: TypedArrayOf<C>;
	private size = 0;

	constructor(
		private readonly arrayType: C,
		iterable?: Iterable<number>,
		options?: TypedVectorOptions,
	) {
		const initialCapacity = options?.initialCapacity ?? MIN_PHYSICAL_LENGTH;

		if (!Number.isInteger(initialCapacity) || initialCapacity < 0) {
			throw new RangeError(
				`Initial capacity must be a non-negative integer, got ${initialCapacity}`,
			);
		}

		const items = iterable === undefined ? undefined : Array.from(iterable);
		const physical = Math.max(
			MIN_PHYSICAL_LENGTH,
			initialCapacity,
			items?.length ?? 0,
		);

		this.data = new this.arrayType(physical) as TypedArrayOf<C>;

		if (items !== undefined) {
			this.data.set(items, 0);
			this.size = items.length;
		}
	}

	/** Slots allocated, not elements held. */
	get physicalLength(): number {
		return this.data.length;
	}

	*[Symbol.iterator](): Iterator<number> {
		for (let index = 0; index < this.size; index++) {
			yield this.data[index] as number;
		}
	}

	count(): number {
		return this.size;
	}

	clear(): void {
		this.size = 0;
	}

	/** O(1). Out of range returns `undefined` rather than throwing. */
	get(index: number): number | undefined {
		if (index < 0 || index >= this.size) {
			return undefined;
		}

		return this.data[index] as number;
	}

	/**
	 * O(1).
	 *
	 * @throws {RangeError} If `index` is outside `0 .. count() - 1`.
	 */
	set(index: number, item: number): void {
		if (index < 0 || index >= this.size) {
			throw new RangeError(`Index ${index} is out of bounds [0, ${this.size})`);
		}

		this.data[index] = item;
	}

	/** O(1) amortised. */
	pushBack(item: number): void {
		this.ensureRoomFor(1);

		this.data[this.size] = item;
		this.size++;
	}

	/** O(n) in the number of items, with one bulk copy and at most one growth. */
	pushBackAll(items: readonly number[]): void {
		if (items.length === 0) {
			return;
		}

		this.ensureRoomFor(items.length);

		this.data.set(items, this.size);
		this.size += items.length;
	}

	/** O(1). */
	popBack(): number | undefined {
		if (this.size === 0) {
			return undefined;
		}

		this.size--;

		// No need to clear the slot: a typed array holds numbers, so a stale value
		// pins nothing for the collector, unlike a generic backing.
		return this.data[this.size] as number;
	}

	/** O(1). */
	back(): number | undefined {
		return this.size === 0 ? undefined : (this.data[this.size - 1] as number);
	}

	/**
	 * A copy of the elements held, as a typed array of the vector's own type.
	 *
	 * A copy rather than a view, so later growth cannot leave the caller holding
	 * a window onto a detached buffer.
	 */
	toTypedArray(): TypedArrayOf<C> {
		return this.data.slice(0, this.size) as TypedArrayOf<C>;
	}

	private ensureRoomFor(extra: number): void {
		const required = this.size + extra;

		if (required <= this.data.length) {
			return;
		}

		const grown = new this.arrayType(
			Math.max(this.data.length * 2, required),
		) as TypedArrayOf<C>;

		grown.set(this.data.subarray(0, this.size) as never, 0);

		this.data = grown;
	}
}
