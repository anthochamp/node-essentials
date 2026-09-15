/** Error thrown when a buffer overflow occurs. */
export class BufferOverflowError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "BufferOverflowError";
	}
}
