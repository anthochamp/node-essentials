import type { Except, TaggedUnion } from "type-fest";
import { defaults } from "./defaults.js";
import {
	type GetObjectKeysOptions,
	getObjectKeys,
	type ObjectKey,
} from "./get-object-keys.js";

export const TraverseSkip: symbol = Symbol("TraverseSkip"); // Skip recursion into children while continuing traversal
export const TraverseBreak: symbol = Symbol("TraverseBreak"); // Skip visiting sibling properties and ascend to parent
export const TraverseHalt: symbol = Symbol("TraverseHalt"); // Halt visiting entirely
export const TraverseContinue: symbol = Symbol("TraverseContinue"); // Continue traversal as normal

export type TraverseKey = TaggedUnion<
	"kind",
	{
		array: { index: number };
		object: ObjectKey;
		map: { key: unknown };
		"map-key": { name: unknown };
		set: { value: unknown };
	}
>;

export type TraverseControl =
	| typeof TraverseContinue
	| typeof TraverseSkip
	| typeof TraverseBreak
	| typeof TraverseHalt;

type TraverseAction = { type: "replace"; value: unknown } | { type: "remove" };

export type TraverseVisitorContext = {
	key: TraverseKey | null;
	parent: unknown | undefined;
	parentPath: TraverseKey[] | null;

	/**
	 * Replace the current value with a new value (including undefined)
	 * If called multiple times, the last call takes precedence
	 */
	replace(value: unknown): void;

	/**
	 * Remove the current value from its container
	 * If called multiple times, the last call takes precedence
	 */
	remove(): void;
};

export type TraverseVisitor = (
	value: unknown,
	context: TraverseVisitorContext,
) => TraverseControl;

export type TraverseCustomObjectsOption =
	| false
	// biome-ignore lint/complexity/noBannedTypes: intentional
	| Function[]
	| ((value: object) => boolean);

export type TraverseOptions = GetObjectKeysOptions & {
	/**
	 * Whether to call the visitor on primitive values (string, number, boolean, null, undefined, symbol, bigint)
	 * @default true
	 */
	visitPrimitives?: boolean;

	/**
	 * Whether to call the visitor on object values (arrays, maps, sets, plain objects, custom objects)
	 * @default true
	 */
	visitObjects?: boolean;

	/**
	 * Whether to traverse into array elements
	 * @default true
	 */
	traverseArrays?: boolean;

	/**
	 * Whether to traverse into Map keys and values
	 * @default true
	 */
	traverseMaps?: boolean;

	/**
	 * Whether to traverse into Map keys specifically
	 * Only applies when traverseMaps is true
	 * @default false
	 */
	traverseMapKeys?: boolean;

	/**
	 * Whether to traverse into Set values
	 * @default true
	 */
	traverseSets?: boolean;

	/**
	 * Whether to traverse into plain object (POJO) properties
	 * @default true
	 */
	traversePlainObjects?: boolean;

	/**
	 * Controls traversal into custom object (user-defined class instances) properties
	 * - false: Don't traverse custom objects (treat as opaque)
	 * - Constructor[]: Only traverse instances of these classes (or their descendants)
	 * - (value: object) => boolean: Custom predicate to determine traversability
	 * @default false
	 */
	traverseCustomObjects?: TraverseCustomObjectsOption;
};

export const TRAVERSE_DEFAULT_OPTIONS: Required<TraverseOptions> = {
	includeSymbolKeys: false,
	includeNonEnumerable: false,
	includePrototypeChain: true,

	visitPrimitives: true,
	visitObjects: true,
	traverseArrays: true,
	traverseMaps: true,
	traverseMapKeys: false,
	traverseSets: true,
	traversePlainObjects: true,
	traverseCustomObjects: false,
};

const CONTROL_SYMBOLS = new Set([TraverseSkip, TraverseBreak, TraverseHalt]);

export function traverse(
	value: unknown,
	callback: TraverseVisitor,
	options?: TraverseOptions,
): unknown {
	const effectiveOptions = defaults(options, TRAVERSE_DEFAULT_OPTIONS);

	const context = wrapContext({
		key: null,
		parent: undefined,
		parentPath: null,
	});
	const result = traverseValue_(value, callback, effectiveOptions, context);

	// Check if top-level value was removed
	if (context.action_?.type === "remove") {
		return;
	}

	// If halt occurred, return the partially-mutated original value
	if (result === TraverseHalt) {
		return value;
	}

	return result;
}

function traverseValue_(
	value: unknown,
	visitor: TraverseVisitor,
	options: Required<TraverseOptions>,
	context: Context_,
): unknown {
	// Check if we should visit this value based on its type
	const isObject = typeof value === "object" && value !== null;
	const shouldVisit = isObject ? options.visitObjects : options.visitPrimitives;

	if (!shouldVisit) {
		return value;
	}

	// Reset action state before calling visitor
	context.action_ = null;

	const result = visitor(value, context);

	// Check context action first (takes precedence)
	const action = context.action_ as TraverseAction | null;
	if (action) {
		if (action.type === "remove") {
			return TraverseHalt; // Use TraverseHalt as removal signal internally
		}
		// action.type === "replace"
		value = (action as { type: "replace"; value: unknown }).value;
	}

	// Check if result is a control symbol
	if (isControlSymbol(result)) {
		if (result === TraverseSkip) {
			return value;
		}
		if (result === TraverseBreak || result === TraverseHalt) {
			return result; // Propagate control flow
		}
	}

	// Now potentially traverse into the value if it's an object
	if (typeof value === "object" && value !== null) {
		const parentPath = [...(context.parentPath ?? [])];
		if (context.key !== null) {
			parentPath.push(context.key);
		}

		if (Array.isArray(value)) {
			if (options.traverseArrays) {
				return traverseArrayIndices_(value, visitor, options, parentPath);
			}
			// Don't traverse if option is false
			return value;
		}

		if (value instanceof Set) {
			if (options.traverseSets) {
				return traverseSetValues_(value, visitor, options, parentPath);
			}
			// Don't traverse if option is false
			return value;
		}

		if (value instanceof Map) {
			if (options.traverseMaps) {
				return traverseMapEntries_(value, visitor, options, parentPath);
			}
			// Don't traverse if option is false
			return value;
		}

		// Check if we should traverse this object's properties
		const shouldTraverseObject =
			(isPlainObject(value) && options.traversePlainObjects) ||
			(!isPlainObject(value) &&
				shouldTraverseCustomObject(value, options.traverseCustomObjects));

		if (shouldTraverseObject) {
			return traverseObjectProperties_(value, visitor, options, parentPath);
		}

		// Non-traversable object, return as-is
		return value;
	}

	return value;
}

function traverseArrayIndices_(
	array: unknown[],
	visitor: TraverseVisitor,
	options: Required<TraverseOptions>,
	parentPath: TraverseKey[],
): unknown[] | typeof TraverseHalt {
	// Snapshot indices before iteration to handle sparse arrays and mutations
	const indices: number[] = [];
	for (const indexStr in array) {
		indices.push(+indexStr);
	}

	const indicesToRemove: number[] = [];
	let halted = false;

	for (const index of indices) {
		const context = wrapContext({
			key: { kind: "array", index },
			parent: array,
			parentPath,
		});

		const transformed = traverseValue_(array[index], visitor, options, context);

		if (transformed === TraverseHalt) {
			// Check if it's a remove signal or actual halt
			if (context.action_?.type === "remove") {
				indicesToRemove.push(index);
			} else {
				halted = true;
				break;
			}
			continue;
		}

		if (transformed === TraverseBreak) {
			break;
		}

		// Check for replacement via context
		if (context.action_?.type === "replace") {
			array[index] = context.action_.value;
		} else if (transformed !== array[index]) {
			array[index] = transformed;
		}
	}

	// Remove marked indices in reverse order to maintain correct indices
	for (let i = indicesToRemove.length - 1; i >= 0; i--) {
		const indexToRemove = indicesToRemove[i];
		if (indexToRemove !== undefined) {
			array.splice(indexToRemove, 1);
		}
	}

	if (halted) {
		return TraverseHalt;
	}

	return array;
}

function traverseMapEntries_(
	map: Map<unknown, unknown>,
	visitor: TraverseVisitor,
	options: Required<TraverseOptions>,
	parentPath: TraverseKey[],
): Map<unknown, unknown> | typeof TraverseHalt {
	// Snapshot entries before iteration to prevent iterator invalidation
	const entries = Array.from(map.entries());

	const entriesToUpdate: Array<{
		oldKey: unknown;
		newKey: unknown;
		newValue: unknown;
	}> = [];
	const keysToRemove: unknown[] = [];
	let halted = false;

	for (const [key, value] of entries) {
		let transformedKey = key;

		// Traverse into Map keys only if traverseMapKeys is enabled
		if (options.traverseMapKeys) {
			const keyContext = wrapContext({
				key: { kind: "map-key", name: key },
				parent: map,
				parentPath,
			});
			transformedKey = traverseValue_(key, visitor, options, keyContext);

			if (transformedKey === TraverseHalt) {
				if (keyContext.action_?.type === "remove") {
					keysToRemove.push(key);
					continue;
				}
				halted = true;
				break;
			}

			if (transformedKey === TraverseBreak) {
				break;
			}

			if (keyContext.action_?.type === "replace") {
				transformedKey = keyContext.action_.value;
			}
		}

		// Visit value
		const valueContext = wrapContext({
			key: { kind: "map", key },
			parent: map,
			parentPath,
		});
		const transformedValue = traverseValue_(
			value,
			visitor,
			options,
			valueContext,
		);

		if (transformedValue === TraverseHalt) {
			if (valueContext.action_?.type === "remove") {
				keysToRemove.push(key);
				continue;
			}
			halted = true;
			break;
		}

		if (transformedValue === TraverseBreak) {
			break;
		}

		let finalValue = value;
		if (valueContext.action_?.type === "replace") {
			finalValue = valueContext.action_.value;
		} else if (transformedValue !== value) {
			finalValue = transformedValue;
		}

		if (transformedKey !== key || finalValue !== value) {
			entriesToUpdate.push({
				oldKey: key,
				newKey: transformedKey,
				newValue: finalValue,
			});
		}
	}

	// Apply changes to the map
	for (const key of keysToRemove) {
		map.delete(key);
	}

	for (const { oldKey, newKey, newValue } of entriesToUpdate) {
		if (oldKey !== newKey) {
			map.delete(oldKey);
		}
		map.set(newKey, newValue);
	}

	if (halted) {
		return TraverseHalt;
	}

	return map;
}

function traverseSetValues_(
	set: Set<unknown>,
	visitor: TraverseVisitor,
	options: Required<TraverseOptions>,
	parentPath: TraverseKey[],
): Set<unknown> | typeof TraverseHalt {
	// Snapshot values before iteration to prevent iterator invalidation
	const values = Array.from(set.values());

	const valuesToRemove: unknown[] = [];
	const valuesToAdd: Array<{ old: unknown; new: unknown }> = [];
	let halted = false;

	for (const item of values) {
		const context = wrapContext({
			key: { kind: "set", value: item },
			parent: set,
			parentPath,
		});

		const transformed = traverseValue_(item, visitor, options, context);

		if (transformed === TraverseHalt) {
			if (context.action_?.type === "remove") {
				valuesToRemove.push(item);
				continue;
			}
			halted = true;
			break;
		}

		if (transformed === TraverseBreak) {
			break;
		}

		if (context.action_?.type === "replace") {
			valuesToAdd.push({ old: item, new: context.action_.value });
		} else if (transformed !== item) {
			valuesToAdd.push({ old: item, new: transformed });
		}
	}

	// Apply changes to the set
	for (const value of valuesToRemove) {
		set.delete(value);
	}

	for (const { old: oldValue, new: newValue } of valuesToAdd) {
		set.delete(oldValue);
		set.add(newValue);
	}

	if (halted) {
		return TraverseHalt;
	}

	return set;
}

/**
 * Traverse object properties
 *
 * @param object - The object to traverse
 * @param visitor - The visitor callback
 * @param options - Traverse options
 * @param parentPath - The path to the parent object
 * @returns
 */
function traverseObjectProperties_(
	object: object,
	visitor: TraverseVisitor,
	options: Required<TraverseOptions>,
	parentPath: TraverseKey[],
): object | typeof TraverseHalt {
	const keys = getObjectKeys(object, options);
	let halted = false;

	for (const key of keys) {
		const context = wrapContext({
			key: { kind: "object", ...key },
			parent: object,
			parentPath,
		});

		const transformed = traverseValue_(
			(object as Record<string | symbol, unknown>)[key.property],
			visitor,
			options,
			context,
		);

		if (transformed === TraverseHalt) {
			if (context.action_?.type === "remove") {
				delete (object as Record<string | symbol, unknown>)[key.property];
				continue;
			}
			halted = true;
			break;
		}

		if (transformed === TraverseBreak) {
			break;
		}

		const currentValue = (object as Record<string | symbol, unknown>)[
			key.property
		];
		if (context.action_?.type === "replace") {
			(object as Record<string | symbol, unknown>)[key.property] =
				context.action_.value;
		} else if (transformed !== currentValue) {
			(object as Record<string | symbol, unknown>)[key.property] = transformed;
		}
	}

	if (halted) {
		return TraverseHalt;
	}

	return object;
}

function isControlSymbol(value: unknown): value is TraverseControl {
	return typeof value === "symbol" && CONTROL_SYMBOLS.has(value);
}

/**
 * Internal context with action state
 * @internal
 */
type Context_ = TraverseVisitorContext & {
	action_: TraverseAction | null;
};

/**
 * Wrap visitor context to add action methods
 */
function wrapContext(
	visitorContext: Except<TraverseVisitorContext, "replace" | "remove">,
): Context_ {
	const context: Context_ = {
		...visitorContext,
		action_: null,
		replace(value: unknown) {
			context.action_ = { type: "replace", value };
		},
		remove() {
			context.action_ = { type: "remove" };
		},
	};

	return context;
}

/**
 * Check if a value is a plain object (POJO)
 */
function isPlainObject(value: object): boolean {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Check if a custom object should be traversed based on options
 */
function shouldTraverseCustomObject(
	value: object,
	options: TraverseCustomObjectsOption,
): boolean {
	if (options === false) {
		return false;
	}

	if (typeof options === "function") {
		return options(value);
	}

	// Array of constructor functions - check instanceof
	for (const ctor of options) {
		if (value instanceof ctor) {
			return true;
		}
	}

	return false;
}
