import { promisify } from "node:util";
import { flock } from "fs-ext";

export type FlockFlags = Parameters<typeof flock>[1];

export const flockAsync: (fd: number, flags: FlockFlags) => Promise<void> =
	promisify(flock);
