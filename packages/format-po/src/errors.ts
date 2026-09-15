/** Input that is not a well-formed PO file, with the line it gave up on. */
export class PoSyntaxError extends SyntaxError {
	constructor(
		readonly line: number,
		detail: string,
	) {
		super(`${detail} on line ${line}`);
		this.name = "PoSyntaxError";
	}
}

/** A `Plural-Forms` header field that does not parse. */
export class PluralFormsSyntaxError extends SyntaxError {
	constructor(
		readonly source: string,
		readonly offset: number,
		detail: string,
	) {
		super(`${detail} at offset ${offset} in ${JSON.stringify(source)}`);
		this.name = "PluralFormsSyntaxError";
	}
}
