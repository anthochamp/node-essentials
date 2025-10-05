import contentDispositionLib from "content-disposition";
import contentTypeLib from "content-type";
import { HttpFields } from "./fields/http-fields.js";

export type HttpContentType = contentTypeLib.ParsedMediaType;
export type HttpContentDisposition = contentDispositionLib.ContentDisposition;

export class HttpHeaders extends HttpFields {
	get lastModified(): Date | null {
		const lastModifiedHeader = this.get("last-modified")?.[0];
		if (!lastModifiedHeader) {
			return null;
		}
		const date = new Date(lastModifiedHeader);
		if (Number.isNaN(date.getTime())) {
			throw new Error("Invalid Last-Modified header");
		}

		return date;
	}

	get contentLength(): number | null {
		const contentLengthHeader = this.get("content-length")?.[0];
		if (!contentLengthHeader) {
			return null;
		}
		const length = parseInt(contentLengthHeader, 10);
		if (Number.isNaN(length)) {
			throw new Error("Invalid Content-Length header");
		}

		return length;
	}

	get contentType(): HttpContentType[] | null {
		return (
			this.get("content-type")?.map((v) => contentTypeLib.parse(v)) ?? null
		);
	}

	get contentDisposition(): HttpContentDisposition[] | null {
		return (
			this.get("content-disposition")?.map((v) =>
				contentDispositionLib.parse(v),
			) ?? null
		);
	}
}
