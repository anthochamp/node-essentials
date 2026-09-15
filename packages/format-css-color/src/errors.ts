/** Input that is not a `<color>`, with the offset the parse gave up at. */
export class CssColorSyntaxError extends SyntaxError {
	constructor(
		readonly source: string,
		readonly offset: number,
		detail: string,
	) {
		super(`${detail} at offset ${offset} in ${JSON.stringify(source)}`);
		this.name = "CssColorSyntaxError";
	}
}

/** A colour that cannot be evaluated without context the caller did not give. */
export class UnresolvedColorError extends Error {
	constructor(detail: string) {
		super(detail);
		this.name = "UnresolvedColorError";
	}
}
