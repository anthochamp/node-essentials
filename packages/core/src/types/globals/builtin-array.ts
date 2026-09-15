export {};

declare global {
	interface ArrayConstructor {
		/**
		 * A safer `Array.isArray` narrowing to `unknown[]` rather than `any[]`,
		 * which stops an unchecked `any` from leaking out of the guard.
		 *
		 * The element type is preserved by TypeScript's own union filtering:
		 * `string | string[]` narrows to `string[]`. A lone `readonly T[]` narrows
		 * to `readonly T[] & unknown[]` — indexing still yields `T`.
		 *
		 * @param arg The value to check.
		 * @returns True if the value is an array.
		 */
		isArray(arg: unknown): arg is unknown[];
	}
}
