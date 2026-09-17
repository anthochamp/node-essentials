/** Text that is not a well-formed address, prefix, range or endpoint. */
export class NetAddressSyntaxError extends SyntaxError {
	constructor(
		readonly source: string,
		detail: string,
	) {
		super(`${detail} in ${JSON.stringify(source)}`);
		this.name = "NetAddressSyntaxError";
	}
}
