import type { DefinedValue } from "@ac-kit/core";

import { IIndexedStorage } from "../storage/iindexed-storage.js";
import { IBidirectionalCursorSequence } from "./ibidirectional-cursor-sequence.js";
import { IRandomAccessCursor } from "./irandom-access-cursor.js";

type IndexCursorState = {
	index: number;
	/** Permanently set once this exact position was deleted; never reset. */
	removed: boolean;
};

/** What `IndexCursorSequence` needs from its owning list. */
export type IndexCursorHost<T extends DefinedValue> = IIndexedStorage<T> & {
	count(): number;
	splice(start: number, deleteCount?: number, item?: T): IterableIterator<T>;
	spliceAll(
		start: number,
		deleteCount?: number,
		items?: readonly T[],
	): IterableIterator<T>;
};

/**
 * IBidirectionalCursorSequence implementation.
 *
 * Every live cursor is tracked via a `WeakRef`, so it costs nothing once the
 * cursor itself becomes unreachable. Each structural mutation walks the
 * registry once (`notifyMutation`/`notifyClear`, called by the host) and shifts
 * or invalidates every entry — this is what lets an `IRandomAccessCursor`
 * auto-adjust instead of silently reading a shifted element after an
 * insertion/removal elsewhere in the same list.
 *
 * A cursor past the end (from `end()`, or having advanced off the tail) is
 * `!valid` but keeps tracking the list's current `count()` through further
 * mutations, the same way `retreat()`-ing from it always reaches whatever is
 * currently the last element. A cursor whose specific element was deleted is
 * `!valid` too, but permanently: its index is frozen, `advance`/`retreat`/
 * `seek` refuse to move it, and passing it to any `ICursorSequence` mutator
 * throws, rather than silently acting on a stale, unrelated position.
 */
export class IndexCursorSequence<
	T extends DefinedValue,
> implements IBidirectionalCursorSequence<T, IRandomAccessCursor<T>> {
	private readonly entries: WeakRef<IndexCursorState>[] = [];

	constructor(private readonly host: IndexCursorHost<T>) {}

	begin(): IRandomAccessCursor<T> {
		return this.cursorAt(0);
	}

	end(): IRandomAccessCursor<T> {
		return this.cursorAt(this.host.count());
	}

	cursorAt(index: number): IRandomAccessCursor<T> {
		const count = this.host.count();
		index = index < 0 ? count + index : index;

		return new IndexCursor(this.host, this, this.register(index, false));
	}

	insertAfter(cursor: IRandomAccessCursor<T>, item: T): void {
		const index = this.resolveIndex(cursor);
		const start = cursor.valid ? index + 1 : index;

		this.host.splice(start, 0, item);
	}

	insertAllAfter(cursor: IRandomAccessCursor<T>, items: readonly T[]): void {
		const index = this.resolveIndex(cursor);
		const start = cursor.valid ? index + 1 : index;

		this.host.spliceAll(start, 0, items);
	}

	insertBefore(cursor: IRandomAccessCursor<T>, item: T): void {
		const index = this.resolveIndex(cursor);

		this.host.splice(index, 0, item);
	}

	insertAllBefore(cursor: IRandomAccessCursor<T>, items: readonly T[]): void {
		const index = this.resolveIndex(cursor);

		this.host.spliceAll(index, 0, items);
	}

	removeAfter(cursor: IRandomAccessCursor<T>): T | undefined {
		const index = this.resolveIndex(cursor);
		const start = cursor.valid ? index + 1 : index;

		return this.host.splice(start, 1).next().value;
	}

	removeAt(cursor: IRandomAccessCursor<T>): T | undefined {
		const index = this.resolveIndex(cursor);

		if (!cursor.valid) {
			return undefined;
		}

		return this.host.splice(index, 1).next().value;
	}

	setAt(cursor: IRandomAccessCursor<T>, item: T): void {
		const index = this.resolveIndex(cursor);

		if (!cursor.valid) {
			throw new RangeError("Cannot setAt a past-the-end cursor");
		}

		this.host.set(index, item);
	}

	/** Called by the host after every `splice`/append-only `set`. */
	notifyMutation(at: number, deleteCount: number, insertCount: number): void {
		// Hot path: a list nobody took a cursor on must not pay for cursor upkeep.
		if (this.entries.length === 0) {
			return;
		}

		const delta = insertCount - deleteCount;

		let writeIndex = 0;
		for (const entry of this.entries) {
			const state = entry.deref();
			if (state === undefined) {
				continue;
			}

			if (!state.removed) {
				if (state.index >= at && state.index < at + deleteCount) {
					state.removed = true;
				} else if (state.index >= at + deleteCount) {
					state.index += delta;
				}
			}

			this.entries[writeIndex++] = entry;
		}
		this.entries.length = writeIndex;
	}

	/** Called by the host after every `clear`. */
	notifyClear(): void {
		if (this.entries.length === 0) {
			return;
		}

		for (const entry of this.entries) {
			const state = entry.deref();
			if (state !== undefined) {
				state.removed = true;
			}
		}
		this.entries.length = 0;
	}

	/** @internal Used by `IndexCursor.clone` only. */
	register(index: number, removed: boolean): IndexCursorState {
		const state: IndexCursorState = { index, removed };
		this.entries.push(new WeakRef(state));
		return state;
	}

	private resolveIndex(cursor: IRandomAccessCursor<T>): number {
		if (cursor instanceof IndexCursor && cursor._isRemoved()) {
			throw new RangeError("Cursor's element has been removed from the list");
		}

		return cursor.index;
	}
}

class IndexCursor<T extends DefinedValue> implements IRandomAccessCursor<T> {
	constructor(
		private readonly host: IndexCursorHost<T>,
		private readonly sequence: IndexCursorSequence<T>,
		private readonly state: IndexCursorState,
	) {}

	get valid(): boolean {
		return !this.state.removed && this.state.index < this.host.count();
	}

	get index(): number {
		return this.state.index;
	}

	get value(): T | undefined {
		return this.valid ? this.host.get(this.state.index) : undefined;
	}

	advance(): boolean {
		if (this.state.removed) {
			return false;
		}

		return this.seekAbsolute(this.state.index + 1);
	}

	retreat(): boolean {
		if (this.state.removed) {
			return false;
		}

		return this.seekAbsolute(this.state.index - 1);
	}

	seek(index: number): boolean {
		if (this.state.removed) {
			return false;
		}

		const count = this.host.count();
		return this.seekAbsolute(index < 0 ? count + index : index);
	}

	/**
	 * `advance`/`retreat` must not run their internal ±1 back through the public
	 * `seek`'s negative-from-the-end reinterpretation.
	 */
	private seekAbsolute(index: number): boolean {
		const count = this.host.count();

		if (index < 0 || index > count) {
			return false;
		}

		this.state.index = index;
		return index < count;
	}

	clone(): IndexCursor<T> {
		return new IndexCursor(
			this.host,
			this.sequence,
			this.sequence.register(this.state.index, this.state.removed),
		);
	}

	/** @internal Used by `IndexCursorSequence` only. */
	_isRemoved(): boolean {
		return this.state.removed;
	}
}
