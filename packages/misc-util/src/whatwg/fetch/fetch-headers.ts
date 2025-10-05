import { HttpHeaders } from "../../net/http/http-headers.js";

export type FetchHeadersLike = Exclude<RequestInit["headers"], undefined>;
export type FetchHeaders = Headers;

/**
 * Converts an HttpHeaders instance to a Fetch Headers instance.
 *
 * @param headers HttpHeaders instance to convert
 * @returns A Fetch Headers instance
 */
export function httpHeadersToFetchHeaders(headers: HttpHeaders): FetchHeaders {
	const fetchHeaders = new Headers();

	for (const [name, values] of headers) {
		for (const value of values) {
			fetchHeaders.append(name, value);
		}
	}

	return fetchHeaders;
}

/**
 * Converts a Fetch Headers-like instance to an HttpHeaders instance.
 *
 * @param fetchHeadersLike Fetch Headers-like instance to convert
 * @returns An HttpHeaders instance
 */
export function fetchHeadersLikeToHttpHeaders(
	fetchHeadersLike: FetchHeadersLike,
): HttpHeaders {
	return new HttpHeaders(fetchHeadersLike);
}
