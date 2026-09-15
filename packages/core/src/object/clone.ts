import type { TypedArray } from "type-fest";

import { UnsupportedError } from "../error/unsupported-error.js";
import { isArrayBuffer } from "../guards/is-array-buffer.js";
import { isDataView } from "../guards/is-data-view.js";
import { isDate } from "../guards/is-date.js";
import { isMap } from "../guards/is-map.js";
import { isPrimitive } from "../guards/is-primitive.js";
import { isPromise } from "../guards/is-promise.js";
import { isRegExp } from "../guards/is-regexp.js";
import { isSet } from "../guards/is-set.js";
import { isSharedArrayBuffer } from "../guards/is-shared-array-buffer.js";
import { isTypedArray } from "../guards/is-typed-array.js";
import { isWeakMap } from "../guards/is-weak-map.js";
import { isWeakSet } from "../guards/is-weak-set.js";
import { getObjectKeys } from "./get-object-keys.js";

/** What to do with a value that cannot be copied. */
export type CloneUnsupportedPolicy = "throw" | "reference" | "omit";

export type CloneOptions = {
	/**
	 * Whether to clone nested values too, so the copy shares no reference with
	 * the original. Defaults to `false`.
	 *
	 * Recursing costs the whole tree rather than the top level. Cycles and
	 * repeated references are preserved: an object reached twice is cloned once
	 * and the copy is shared, exactly as the original was.
	 */
	recursive?: boolean;

	/**
	 * `ArrayBuffer`s to move into the clone instead of copying. Each one is
	 * detached from the caller, so the original and every view over it become
	 * unusable — in exchange the bytes are never copied.
	 *
	 * Only an `ArrayBuffer` can be transferred. The other `Transferable` types
	 * (`MessagePort`, the stream types, `ImageBitmap`, …) can only be moved by
	 * the host, so passing one throws.
	 *
	 * Every entry must be reached by the value being cloned, or it throws. This
	 * deliberately differs from `structuredClone`, which detaches an unreachable
	 * entry anyway and then discards it.
	 *
	 * Without `recursive`, only buffers reachable at depth 1 are considered,
	 * since nothing deeper is visited.
	 */
	transfer?: readonly ArrayBuffer[];

	/**
	 * `"preserve"` (default) keeps the original's prototype, so a class instance
	 * clones as an instance of the same class. `"plain"` produces an ordinary
	 * object instead, the way `structuredClone` does.
	 */
	prototype?: "preserve" | "plain";

	/** Whether to copy symbol-keyed properties. Defaults to `true`. */
	symbolKeys?: boolean;

	/** Whether to copy non-enumerable properties. Defaults to `true`. */
	nonEnumerable?: boolean;

	/**
	 * Whether to copy property attributes — writable, enumerable, configurable,
	 * and getters/setters. Defaults to `true`.
	 *
	 * An accessor cannot be deep-copied: its getter and setter are functions, so
	 * preserving one shares those functions with the original. Set this to
	 * `false` to read each accessor once and store the result as a plain writable
	 * data property, which is what a consumer that intends to overwrite the copy
	 * needs.
	 */
	descriptors?: boolean;

	/**
	 * What to do with a value that cannot be copied — a function, a symbol, a
	 * `WeakMap`/`WeakSet`, a `Promise`. `"throw"` (default) reports it,
	 * `"reference"` shares the original, `"omit"` drops the property holding it.
	 *
	 * Only consulted for values actually visited, so a shallow clone never
	 * inspects property values and never applies this to them.
	 */
	unsupported?: CloneUnsupportedPolicy;
};

/** Signals that a value was dropped, so its property is skipped entirely. */
const OMIT_: unique symbol = Symbol("clone.omit");

/**
 * Platform types whose data lives in internal slots rather than in properties,
 * so copying their descriptors would yield a hollow object. Only the host can
 * copy these, so they are handed to `structuredClone` — which ignores every
 * fidelity option below, because it is the only implementation available.
 *
 * Anything absent from this set, including a class carrying its own
 * `Symbol.toStringTag`, is copied normally and keeps its prototype.
 */
const HOST_OBJECT_TAGS_: ReadonlySet<string> = new Set([
	"[object AudioData]",
	"[object Blob]",
	"[object CryptoKey]",
	"[object DOMException]",
	"[object DOMMatrix]",
	"[object DOMMatrixReadOnly]",
	"[object DOMPoint]",
	"[object DOMPointReadOnly]",
	"[object DOMQuad]",
	"[object DOMRect]",
	"[object DOMRectReadOnly]",
	"[object File]",
	"[object FileList]",
	"[object ImageBitmap]",
	"[object ImageData]",
	"[object RTCCertificate]",
	"[object VideoFrame]",
]);

type Resolved_ = {
	recursive: boolean;
	prototype: "preserve" | "plain";
	symbolKeys: boolean;
	nonEnumerable: boolean;
	descriptors: boolean;
	unsupported: CloneUnsupportedPolicy;
	/** Source buffer to its transferred replacement, so every view agrees. */
	moved: Map<ArrayBuffer, ArrayBuffer> | null;
	/** Requested transfers not yet reached. */
	pending: Set<ArrayBuffer> | null;
	/** Original to clone, preserving cycles and repeated references. */
	seen: WeakMap<object, unknown> | null;
};

/**
 * Clone a value.
 *
 * By default the copy is faithful: it keeps the original's prototype, its
 * symbol-keyed and non-enumerable properties, and its property attributes. Pass
 * `recursive` to copy nested values too.
 *
 * Time complexity: O(1) in the size of the tree for a shallow clone, O(n) over
 * every reachable value for a recursive one.
 *
 * @param value The value to clone
 * @param options Clone options
 * @returns The cloned value
 * @throws {UnsupportedError} If a value cannot be copied and `unsupported` is
 *   `"throw"`, or if the transfer list is invalid or not fully reached.
 */
export function clone<T>(value: T, options?: CloneOptions): T {
	const recursive = options?.recursive ?? false;
	const pending =
		options?.transfer === undefined ? null : prepareTransfer_(options.transfer);

	const resolved: Resolved_ = {
		recursive,
		prototype: options?.prototype ?? "preserve",
		symbolKeys: options?.symbolKeys ?? true,
		nonEnumerable: options?.nonEnumerable ?? true,
		descriptors: options?.descriptors ?? true,
		unsupported: options?.unsupported ?? "throw",
		moved: pending === null ? null : new Map(),
		pending,
		seen: recursive ? new WeakMap() : null,
	};

	const cloned = cloneValue_(value, resolved);

	if (pending !== null && pending.size > 0) {
		throw new UnsupportedError(
			"transfer list holds an ArrayBuffer the cloned value does not reach",
		);
	}

	return (cloned === OMIT_ ? undefined : cloned) as T;
}

function prepareTransfer_(transfer: readonly ArrayBuffer[]): Set<ArrayBuffer> {
	const pending = new Set<ArrayBuffer>();

	for (const buffer of transfer) {
		if (isSharedArrayBuffer(buffer)) {
			throw new UnsupportedError(
				"a SharedArrayBuffer is shared, not transferable",
			);
		}
		if (!isArrayBuffer(buffer)) {
			throw new UnsupportedError(
				`only an ArrayBuffer can be transferred, got ${describe_(buffer)}`,
			);
		}
		if (buffer.detached) {
			throw new UnsupportedError("an already-detached ArrayBuffer");
		}
		if (pending.has(buffer)) {
			throw new UnsupportedError(
				"a duplicate ArrayBuffer in the transfer list",
			);
		}
		pending.add(buffer);
	}

	return pending;
}

function cloneValue_(value: unknown, options: Resolved_): unknown {
	if (isPrimitive(value)) {
		// every primitive but a symbol is already immutable
		return typeof value === "symbol"
			? unsupported_(value, "a symbol", options)
			: value;
	}

	if (typeof value === "function") {
		return unsupported_(value, "a function", options);
	}

	const seen = options.seen?.get(value);
	if (seen !== undefined) {
		return seen;
	}

	return cloneObject_(value, options);
}

function cloneObject_(value: object, options: Resolved_): unknown {
	// bytes first: these own storage rather than properties
	if (isArrayBuffer(value)) {
		return remember_(
			value,
			takeMoved_(value, options) ?? value.slice(0),
			options,
		);
	}
	if (isSharedArrayBuffer(value)) {
		// copying shared memory would defeat the point of sharing it
		return remember_(value, value, options);
	}
	if (isTypedArray(value) || isDataView(value)) {
		return remember_(value, cloneView_(value, options), options);
	}

	if (isWeakMap(value)) {
		return unsupported_(value, "a WeakMap", options);
	}
	if (isWeakSet(value)) {
		return unsupported_(value, "a WeakSet", options);
	}
	if (isPromise(value)) {
		return unsupported_(value, "a Promise", options);
	}

	if (Array.isArray(value)) {
		return cloneArray_(value, options);
	}
	if (isMap(value)) {
		return cloneMap_(value, options);
	}
	if (isSet(value)) {
		return cloneSet_(value, options);
	}
	if (isDate(value)) {
		return remember_(value, cloneDate_(value, options), options);
	}
	if (isRegExp(value)) {
		return remember_(value, cloneRegExp_(value, options), options);
	}

	if (HOST_OBJECT_TAGS_.has(Object.prototype.toString.call(value))) {
		return remember_(value, cloneHostObject_(value, options), options);
	}

	return cloneOrdinary_(value, options);
}

function cloneOrdinary_(value: object, options: Resolved_): unknown {
	const prototype =
		options.prototype === "preserve"
			? (Object.getPrototypeOf(value) as object | null)
			: Object.prototype;

	// nothing is visited, so the whole copy is one call
	if (
		!options.recursive &&
		options.descriptors &&
		options.symbolKeys &&
		options.nonEnumerable &&
		options.moved === null
	) {
		return Object.create(prototype, Object.getOwnPropertyDescriptors(value));
	}

	const target = Object.create(prototype) as object;
	remember_(value, target, options);
	copyOwnProperties_(target, value, options, null);

	return target;
}

function cloneArray_(value: unknown[], options: Resolved_): unknown[] {
	// oxlint-disable-next-line unicorn/no-new-array -- Array.from writes undefined into every slot, which costs a pass and fills the holes this must preserve
	const target = new Array<unknown>(value.length);
	remember_(value, target, options);
	// `length` is already set, and every present index is an own key
	copyOwnProperties_(target, value, options, (key) => key === "length");

	return target;
}

function cloneMap_(
	value: Map<unknown, unknown>,
	options: Resolved_,
): Map<unknown, unknown> {
	const target = new Map<unknown, unknown>();
	remember_(value, target, options);

	for (const [key, item] of value) {
		const clonedKey = cloneChild_(key, options);
		const clonedValue = cloneChild_(item, options);
		if (clonedKey === OMIT_ || clonedValue === OMIT_) {
			continue;
		}
		target.set(clonedKey, clonedValue);
	}

	copyOwnProperties_(target, value, options, null);

	return target;
}

function cloneSet_(value: Set<unknown>, options: Resolved_): Set<unknown> {
	const target = new Set<unknown>();
	remember_(value, target, options);

	for (const item of value) {
		const cloned = cloneChild_(item, options);
		if (cloned !== OMIT_) {
			target.add(cloned);
		}
	}

	copyOwnProperties_(target, value, options, null);

	return target;
}

function cloneDate_(value: Date, options: Resolved_): Date {
	const target = new Date(value.getTime());
	copyOwnProperties_(target, value, options, null);

	return target;
}

function cloneRegExp_(value: RegExp, options: Resolved_): RegExp {
	const target = new RegExp(value.source, value.flags);
	target.lastIndex = value.lastIndex;
	copyOwnProperties_(target, value, options, (key) => key === "lastIndex");

	return target;
}

function cloneHostObject_(value: object, options: Resolved_): unknown {
	try {
		return structuredClone(value);
	} catch (error) {
		return unsupported_(value, describe_(value), options, error);
	}
}

/** A typed array or `DataView` constructor, all of which share this shape. */
type ViewConstructor_ = new (
	buffer: ArrayBufferLike,
	byteOffset: number,
	length: number,
) => TypedArray | DataView;

function cloneView_(
	value: TypedArray | DataView,
	options: Resolved_,
): TypedArray | DataView {
	const buffer = value.buffer;
	// read the geometry first: transferring the buffer detaches this view too
	const byteOffset = value.byteOffset;
	const length = isDataView(value) ? value.byteLength : value.length;

	if (isArrayBuffer(buffer)) {
		const moved = takeMoved_(buffer, options);
		if (moved !== null) {
			return rebuildView_(value, moved, byteOffset, length);
		}
	}

	// a shared buffer stays shared; the view over it is still a fresh object
	if (isSharedArrayBuffer(buffer)) {
		return rebuildView_(value, buffer, byteOffset, length);
	}

	return rebuildView_(value, buffer.slice(0), byteOffset, length);
}

function rebuildView_(
	value: TypedArray | DataView,
	buffer: ArrayBufferLike,
	byteOffset: number,
	length: number,
): TypedArray | DataView {
	// every view constructor takes (buffer, byteOffset, length), but the union of
	// their types exposes no single callable signature
	const construct = value.constructor as unknown as ViewConstructor_;

	return new construct(buffer, byteOffset, length);
}

function takeMoved_(
	buffer: ArrayBuffer,
	options: Resolved_,
): ArrayBuffer | null {
	const moved = options.moved;
	if (moved === null) {
		return null;
	}

	// a buffer with several views is transferred once, then reused
	const already = moved.get(buffer);
	if (already !== undefined) {
		return already;
	}

	if (options.pending?.delete(buffer) !== true) {
		return null;
	}

	const transferred = buffer.transfer();
	moved.set(buffer, transferred);

	return transferred;
}

/**
 * Clone a value held by a container, honouring the shallow mode's promise to
 * leave nested values alone — except for a buffer the caller asked to move.
 */
function cloneChild_(value: unknown, options: Resolved_): unknown {
	if (options.recursive) {
		return cloneValue_(value, options);
	}
	if (options.moved === null) {
		return value;
	}

	if (isArrayBuffer(value)) {
		return takeMoved_(value, options) ?? value;
	}
	if (isTypedArray(value) || isDataView(value)) {
		const buffer = value.buffer;
		if (isArrayBuffer(buffer)) {
			// read the geometry first: transferring detaches this view too
			const byteOffset = value.byteOffset;
			const length = isDataView(value) ? value.byteLength : value.length;
			const moved = takeMoved_(buffer, options);
			if (moved !== null) {
				return rebuildView_(value, moved, byteOffset, length);
			}
		}
	}

	return value;
}

function copyOwnProperties_(
	target: object,
	source: object,
	options: Resolved_,
	skip: ((key: string | symbol) => boolean) | null,
): void {
	for (const key of ownKeys_(source, options)) {
		if (skip?.(key) === true) {
			continue;
		}

		const descriptor = Object.getOwnPropertyDescriptor(source, key);
		if (descriptor === undefined) {
			continue;
		}

		// an accessor's getter and setter are functions, so preserving one shares
		// them; `descriptors: false` reads it once into a data property instead
		if (
			options.descriptors &&
			(descriptor.get !== undefined || descriptor.set !== undefined)
		) {
			Object.defineProperty(target, key, descriptor);
			continue;
		}

		const raw =
			"value" in descriptor ? descriptor.value : descriptor.get?.call(source);
		const value = cloneChild_(raw, options);
		if (value === OMIT_) {
			continue;
		}

		Object.defineProperty(target, key, {
			value,
			writable: options.descriptors ? (descriptor.writable ?? true) : true,
			enumerable: options.descriptors ? descriptor.enumerable : true,
			configurable: options.descriptors ? descriptor.configurable : true,
		});
	}
}

function ownKeys_(source: object, options: Resolved_): (string | symbol)[] {
	// one call answers the default, where nothing is filtered out
	if (options.symbolKeys && options.nonEnumerable) {
		return Reflect.ownKeys(source);
	}

	return getObjectKeys(source, {
		includeSymbolKeys: options.symbolKeys,
		includeNonEnumerable: options.nonEnumerable,
		includePrototypeChain: false,
	}).map((key) => key.property);
}

function remember_<T>(original: object, cloned: T, options: Resolved_): T {
	options.seen?.set(original, cloned);

	return cloned;
}

function unsupported_(
	value: unknown,
	description: string,
	options: Resolved_,
	cause?: unknown,
): unknown {
	switch (options.unsupported) {
		case "reference":
			return value;
		case "omit":
			return OMIT_;
		default:
			throw new UnsupportedError(
				`cannot clone ${description}`,
				cause === undefined ? undefined : { cause },
			);
	}
}

/** Names a value by kind, never by content, so no secret reaches a message. */
function describe_(value: unknown): string {
	if (value === null) {
		return "null";
	}
	if (typeof value !== "object") {
		return `a ${typeof value}`;
	}

	return Object.prototype.toString.call(value);
}
