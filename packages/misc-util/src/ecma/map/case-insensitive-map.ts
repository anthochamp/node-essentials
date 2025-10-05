import { stringIsEqualCaseInsensitive } from "../string/string-is-equal.js";

/**
 * A case-insensitive `Map`.
 *
 * Keys that are strings are treated in a case-insensitive manner.
 */
export class CaseInsensitiveMap<T, U> extends Map<T, U> {
	override set(key: T, value: U): this {
		if (typeof key === "string") {
			for (const k of this.keys()) {
				if (typeof k === "string" && stringIsEqualCaseInsensitive(key, k)) {
					key = k as T;
					break;
				}
			}
		}

		return super.set(key, value);
	}

	override get(key: T): U | undefined {
		if (typeof key === "string") {
			for (const k of this.keys()) {
				if (typeof k === "string" && stringIsEqualCaseInsensitive(key, k)) {
					key = k as T;
					break;
				}
			}
		}

		return super.get(key);
	}

	override has(key: T): boolean {
		if (typeof key === "string") {
			for (const k of this.keys()) {
				if (typeof k === "string" && stringIsEqualCaseInsensitive(key, k)) {
					return true;
				}
			}
		}

		return super.has(key);
	}

	override delete(key: T): boolean {
		if (typeof key === "string") {
			for (const k of this.keys()) {
				if (typeof k === "string" && stringIsEqualCaseInsensitive(key, k)) {
					key = k as T;
					break;
				}
			}
		}

		return super.delete(key);
	}
}
