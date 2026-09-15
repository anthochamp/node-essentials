import { InetAddress } from "./inet-address.js";

/** Represents an Internet endpoint with IP family, address, and port. */
export type InetEndpoint = InetAddress & {
	/** Port number. */
	port: number;
};
