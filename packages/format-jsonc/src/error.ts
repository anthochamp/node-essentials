import jsonc, { type ParseError } from "jsonc-parser";

/** Thrown when JSONC source contains parse errors. */
export class JsoncParseError extends Error {
	readonly offset: number;
	readonly length: number;
	readonly code: ParseError["error"];

	constructor(error: ParseError) {
		super(
			`${jsonc.printParseErrorCode(error.error)} (${error.offset},${error.offset + error.length})`,
		);
		this.offset = error.offset;
		this.length = error.length;
		this.code = error.error;
		this.name = "JsoncParseError";
	}
}
