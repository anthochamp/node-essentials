import { EOL } from "node:os";
import { type InspectOptionsStylized, inspect } from "node:util";
import type { Predicate } from "../../../ecma/function/types.js";
import { CaseInsensitiveMap } from "../../../ecma/map/case-insensitive-map.js";
import { stringIsEqualCaseInsensitive } from "../../../ecma/string/string-is-equal.js";
import {
	httpFieldFoldValues,
	httpFieldUnfoldValues,
} from "./http-field-value-util.js";

export type HttpFieldName = string;
export type HttpFieldValue = string;

export type HttpFieldsLike =
	| Iterable<[HttpFieldName, HttpFieldValue | ReadonlyArray<HttpFieldValue>]>
	| Record<
			HttpFieldName,
			HttpFieldValue | ReadonlyArray<HttpFieldValue> | undefined
	  >;

export type HttpFieldsOptions = {
	/**
	 * Set of fields that are considered sensitive and whose values should be
	 * redacted in logs.
	 *
	 * Can include strings (case-insensitive) or regular expressions.
	 *
	 * Defaults to a set of common sensitive fields.
	 */
	sensitiveFields?: ReadonlyArray<string | RegExp>;

	/**
	 * Set of fields that should not be unfolded when parsing.
	 *
	 * Defaults to a set of common unfoldable fields.
	 */
	unfoldableFields?: ReadonlyArray<string | RegExp>;

	/**
	 * Spacing to use when folding fields (default: single space).
	 */
	foldSpacing?: string;

	/**
	 * If true, the `toString` method will redact sensitive fields (default: true).
	 */
	toStringRedacted?: boolean;

	/**
	 * If true, the custom Node.js inspect method will redact sensitive fields (default: true).
	 */
	nodeInspectRedacted?: boolean;
};

export class HttpFields
	implements Iterable<[HttpFieldName, ReadonlyArray<HttpFieldValue>]>
{
	private readonly options: Required<HttpFieldsOptions>;
	private readonly map: CaseInsensitiveMap<HttpFieldName, HttpFieldValue[]> =
		new CaseInsensitiveMap();

	constructor(initialFields?: HttpFieldsLike, options?: HttpFieldsOptions) {
		this.options = { ...HttpFields.defaultOptions, ...options };

		if (initialFields !== undefined) {
			if (Symbol.iterator in Object(initialFields)) {
				for (const [name, valueOrValues] of initialFields as Iterable<
					[HttpFieldName, HttpFieldValue | ReadonlyArray<HttpFieldValue>]
				>) {
					if (Array.isArray(valueOrValues)) {
						this.append(name, ...valueOrValues);
					} else {
						this.append(name, valueOrValues as HttpFieldValue);
					}
				}
			} else {
				for (const [name, valueOrValuesOrUndefined] of Object.entries(
					initialFields as Record<
						HttpFieldName,
						HttpFieldValue | ReadonlyArray<HttpFieldValue> | undefined
					>,
				)) {
					if (Array.isArray(valueOrValuesOrUndefined)) {
						this.append(name, ...valueOrValuesOrUndefined);
					} else if (valueOrValuesOrUndefined !== undefined) {
						this.append(name, valueOrValuesOrUndefined as HttpFieldValue);
					}
				}
			}
		}
	}

	[Symbol.iterator](): MapIterator<
		[HttpFieldName, ReadonlyArray<HttpFieldValue>]
	> {
		return this.map.entries();
	}

	names(): IterableIterator<HttpFieldName> {
		return this.map.keys();
	}

	foldedEntries(
		redacted: boolean = false,
	): IterableIterator<[HttpFieldName, HttpFieldValue]> {
		return this.map.entries().flatMap(([name, values]) => {
			if (redacted && this.isSensitive(name)) {
				return [[name, "[REDACTED]"]];
			} else if (this.isUnfoldable(name)) {
				return values.map((v) => [name, v]);
			} else {
				return [[name, httpFieldFoldValues(values)]];
			}
		});
	}

	has(name: HttpFieldName): boolean {
		return this.map.has(name);
	}

	get(name: HttpFieldName): ReadonlyArray<HttpFieldValue> | null {
		return this.map.get(name) ?? null;
	}

	set(name: HttpFieldName, values: ReadonlyArray<HttpFieldValue> | null): void {
		if (values === null) {
			this.map.delete(name);
		} else {
			const parsedValues = values.flatMap((v) => httpFieldUnfoldValues(v));

			this.map.set(name, parsedValues);
		}
	}

	clear(): void {
		this.map.clear();
	}

	append(name: HttpFieldName, ...values: ReadonlyArray<HttpFieldValue>): void {
		this.set(name, [...(this.get(name) ?? []), ...values]);
	}

	delete(name: HttpFieldName): void {
		this.map.delete(name);
	}

	filter(
		predicate: Predicate<[HttpFieldName, ReadonlyArray<HttpFieldValue>]>,
	): HttpFields {
		return new HttpFields(
			this.map.entries().filter(([name, values]) => predicate(name, values)),
			this.options,
		);
	}

	toString(): string {
		return Array.from(this.foldedEntries(this.options.toStringRedacted))
			.map(([name, value]) => `${name}: ${value}${EOL}`)
			.join("");
	}

	isUnfoldable(name: HttpFieldName): boolean {
		return this.options.unfoldableFields.values().some((value) => {
			if (typeof value === "string") {
				return stringIsEqualCaseInsensitive(value, name);
			} else {
				return value.test(name);
			}
		});
	}

	isSensitive(name: HttpFieldName): boolean {
		return this.options.sensitiveFields.values().some((value) => {
			if (typeof value === "string") {
				return stringIsEqualCaseInsensitive(value, name);
			} else {
				return value.test(name);
			}
		});
	}
}

Object.defineProperty(
	HttpFields.prototype,
	Symbol.for("nodejs.util.inspect.custom"),
	{
		value: function (depth: number, options: InspectOptionsStylized) {
			const className = this[Symbol.toStringTag] ?? this.constructor.name;
			const stylizedClassName = options.stylize(className, "special");

			if (depth < 0) {
				return stylizedClassName;
			}

			const subOptions = {
				...options,
				depth:
					options.depth === null || options.depth === undefined
						? null
						: options.depth - 2,
			};

			if (subOptions.compact === false) {
				const inner = [];
				for (const [name, values] of this.foldedEntries(
					this.options.nodeInspectRedacted,
				)) {
					inner.push(`  ${name}: ${inspect(values, subOptions)}`);
				}
				return `${stylizedClassName}${EOL}${inner.join(EOL)}`;
			} else {
				const inner = [];

				for (const [name, values] of this.foldedEntries(
					this.options.nodeInspectRedacted,
				)) {
					inner.push(
						`${name}: ${inspect(values, { ...subOptions, compact: true })}`,
					);
				}

				return `${stylizedClassName}<${inner.join(", ")}>`;
			}
		},
		writable: true,
		configurable: true,
	},
);

export declare namespace HttpFields {
	export var defaultOptions: Required<HttpFieldsOptions>;
}

HttpFields.defaultOptions = {
	sensitiveFields: [
		"cookie",
		"set-cookie",
		"proxy-authorization",
		"authorization",
		"www-authenticate",
		"proxy-authenticate",
		/.*[-_]key$/i,
	],

	// https://httpwg.org/specs/rfc9110.html#rfc.section.5.3
	unfoldableFields: ["set-cookie"],

	foldSpacing: " ",

	toStringRedacted: true,
	nodeInspectRedacted: true,
};
