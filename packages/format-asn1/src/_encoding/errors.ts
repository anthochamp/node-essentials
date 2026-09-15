export class EncodingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EncodingError";
	}
}

export class DecodingError extends Error {
	readonly offset: number;
	constructor(message: string, offset = 0) {
		super(message);
		this.name = "DecodingError";
		this.offset = offset;
	}
}
