/**
 * Error thrown when a socket closes before the operation awaiting it could
 * complete.
 *
 * Node.js usually reports a failed connection or handshake through an "error"
 * event, but a peer that drops the transport can close it without one. This
 * error makes that case observable instead of leaving the caller waiting.
 */
export class ConnectionClosedError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);

		this.name = "ConnectionClosedError";
	}
}
