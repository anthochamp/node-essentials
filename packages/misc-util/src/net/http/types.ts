export enum HttpStatusCode {
	OK = 200,
	CREATED = 201,
	ACCEPTED = 202,
	NO_CONTENT = 204,

	MOVED_PERMANENTLY = 301,
	FOUND = 302,
	SEE_OTHER = 303,
	NOT_MODIFIED = 304,
	TEMPORARY_REDIRECT = 307,
	PERMANENT_REDIRECT = 308,

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
