export enum HttpStatusCode {
	OK = 200,
	CREATED = 201,
	ACCEPTED = 202,
	NO_CONTENT = 204,

	FOUND = 302,
	NOT_MODIFIED = 304,

	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,

	CONFLICT = 409,
	PRECONDITION_FAILED = 412,
	UNSUPPORTED_MEDIA_TYPE = 415,
	UNPROCESSABLE_ENTITY = 422,
	TOO_MANY_REQUESTS = 429,

	INTERNAL_SERVER_ERROR = 500,
	SERVICE_UNAVAILABLE = 503,
}

export type HttpIncomingQueryParameterValue = string;
export type HttpOutgoingQueryParameterValue =
	| string
	| number
	| bigint
	| boolean
	| null;

export type HttpIncomingQueryParameterValues =
	| HttpIncomingQueryParameterValue
	| HttpIncomingQueryParameterValue[];
export type HttpOutgoingQueryParameterValues =
	| HttpOutgoingQueryParameterValue
	| HttpOutgoingQueryParameterValue[];

export type HttpIncomingQueryParameters = Record<
	string,
	HttpIncomingQueryParameterValue
>;
export type HttpOutgoingQueryParameters = Record<
	string,
	HttpOutgoingQueryParameterValue
>;
export type HttpQueryParameters = HttpIncomingQueryParameters;

export type HttpHeaderName = string;
export type HttpIncomingHeaderValue = string;
export type HttpOutgoingHeaderValue = string | number | bigint | boolean;

export type HttpHeadersLike<T> = Record<HttpHeaderName, T | T[]>;
export type HttpIncomingHeaders = HttpHeadersLike<HttpIncomingHeaderValue>;
export type HttpOutgoingHeaders = HttpHeadersLike<HttpOutgoingHeaderValue>;
export type HttpHeaders = HttpIncomingHeaders;
