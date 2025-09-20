import type { UnknownRecord } from "type-fest";

/**
 * Assign default options to an object.
 *
 * The first argument has the highest priority, the last argument the lowest.
 * Only properties that are `undefined` in the target object will be assigned
 * from the source objects.
 *
 * This is equivalent to `_.defaults` from Lodash.
 *
 * @param args The objects to merge.
 * @returns The merged object.
 * @example
 * ```ts
 * const options = defaults(
 *   { a: 1 },
 *   { a: 2, b: 2 },
 *   { a: 3, b: 3, c: 3 }
 * );
 *
 * console.log(options); // { a: 1, b: 2, c: 3 }
 * ```
 */
export function defaults<R extends object, P extends Partial<R> = Partial<R>>(
	...args: [...(P | undefined)[], R]
): R {
	return args.reduce((result: P | R, arg) => {
		if (arg) {
			for (const key in arg) {
				if (
					(result as UnknownRecord)[key] === undefined &&
					(arg as UnknownRecord)[key] !== undefined
				) {
					(result as UnknownRecord)[key] = (arg as UnknownRecord)[key];
				}
			}
		}
		return result;
	}, {} as P) as R;
}
