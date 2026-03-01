import { HttpFields } from "./_http-fields.js";

/**
 * HTTP trailer headers.
 *
 * Trailers are headers sent after the message body in chunked transfer encoding
 * (HTTP/1.1) or as trailing HEADERS frames (HTTP/2/3).
 */
export class HttpTrailers extends HttpFields {}
