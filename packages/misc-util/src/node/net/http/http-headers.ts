import type { HttpHeaderName, HttpHeaders, HttpHeadersLike } from "./types.js";

/**
 * Get the value of a header (case-insensitive)
 */
export function httpGetHeaderValue<TValue>(
	headers: HttpHeadersLike<TValue>,
	name: HttpHeaderName,
): TValue | TValue[] | undefined {
	const lowerCaseName = name.toLowerCase();

	for (const headerName in headers) {
		if (headerName.toLowerCase() === lowerCaseName) {
			return headers[headerName];
		}
	}
}

/**
 * Get all values of a header (case-insensitive)
 */
export function httpGetHeaderValues<TValue>(
	headers: HttpHeadersLike<TValue>,
	name: HttpHeaderName,
): TValue[] {
	const value = httpGetHeaderValue(headers, name);

	if (Array.isArray(value)) {
		return value;
	} else if (value) {
		return [value];
	} else {
		return [];
	}
}

/**
 * Filter headers by a predicate function
 */
export function httpFilterHeaders<TValue>(
	headers: HttpHeadersLike<TValue>,
	predicate: (name: HttpHeaderName, value: TValue | TValue[]) => boolean,
): HttpHeadersLike<TValue> {
	const result: HttpHeadersLike<TValue> = {};

	for (const [k, v] of Object.entries(headers)) {
		if (predicate(k, v)) {
			result[k] = v;
		}
	}

	return result;
}

/**
 * Normalize headers: convert all values to string or string[]
 */
export function httpNormalizeHeaders<TValue>(
	headers: HttpHeadersLike<TValue>,
): HttpHeaders {
	const result: HttpHeaders = {};

	for (const [k, v] of Object.entries(headers)) {
		if (Array.isArray(v)) {
			result[k] = v.reduce<string[]>((acc, cur) => {
				if (cur !== null && cur !== undefined) {
					acc.push(cur.toString());
				}
				return acc;
			}, []);
		} else if (v !== null && v !== undefined) {
			result[k] = v.toString();
		}
	}

	return result;
}
