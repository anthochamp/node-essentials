/** Input that is not a well-formed BCP 47 language tag. */
export class LanguageTagSyntaxError extends SyntaxError {
	constructor(
		readonly source: string,
		readonly subtagIndex: number,
		detail: string,
	) {
		super(`${detail} at subtag ${subtagIndex} in ${JSON.stringify(source)}`);
		this.name = "LanguageTagSyntaxError";
	}
}
