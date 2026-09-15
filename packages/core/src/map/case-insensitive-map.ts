/**
 * A case-insensitive `Map`.
 *
 * Keys that are strings are treated in a case-insensitive manner: lookups are
 * O(1) via an internal lowercase-to-original-key index, and `keys()`/
 * `entries()`/iteration still yield the original casing as first inserted.
 */
export class CaseInsensitiveMap<T, U> extends Map<T, U> {
	// Maps lowercased string keys to the original-cased key stored in the map.
	private readonly keyIndex_ = new Map<string, T>();

	constructor(entries?: Iterable<readonly [T, U]> | null) {
		// Skip the native constructor's iterable handling: it would call our
		// overridden `set` before `keyIndex_` is initialized.
		super();

		if (entries) {
			for (const [key, value] of entries) {
				this.set(key, value);
			}
		}
	}

	override set(key: T, value: U): this {
		if (typeof key === "string") {
			const lower = key.toLowerCase();
			const existingKey = this.keyIndex_.get(lower);

			if (existingKey === undefined) {
				this.keyIndex_.set(lower, key);
			} else {
				key = existingKey;
			}
		}

		return super.set(key, value);
	}

	override get(key: T): U | undefined {
		if (typeof key === "string") {
			const existingKey = this.keyIndex_.get(key.toLowerCase());
			return existingKey === undefined ? undefined : super.get(existingKey);
		}

		return super.get(key);
	}

	override has(key: T): boolean {
		if (typeof key === "string") {
			return this.keyIndex_.has(key.toLowerCase());
		}

		return super.has(key);
	}

	override delete(key: T): boolean {
		if (typeof key === "string") {
			const lower = key.toLowerCase();
			const existingKey = this.keyIndex_.get(lower);

			if (existingKey === undefined) {
				return false;
			}

			this.keyIndex_.delete(lower);
			return super.delete(existingKey);
		}

		return super.delete(key);
	}

	override clear(): void {
		this.keyIndex_.clear();
		super.clear();
	}
}
