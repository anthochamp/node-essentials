import mimeDb from "mime-db";

export function getFirstMimeTypeFileExtension(mimeType: string): string | null {
	return mimeDb[mimeType]?.extensions?.[0] ?? null;
}
