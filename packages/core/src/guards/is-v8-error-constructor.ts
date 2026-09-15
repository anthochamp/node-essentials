import type { V8CallSite } from "../types/v8-call-site.js";

/**
 * V8-specific additions to ErrorConstructor (Chrome, Node.js). Not universally
 * available.
 */
interface IV8ErrorConstructor {
	captureStackTrace(target: object, constructorOpt?: Function): void;
	stackTraceLimit: number;
	prepareStackTrace?: (error: Error, callSites: V8CallSite[]) => unknown;
}

export function isV8ErrorConstructor(
	errorConstructor: Function,
): errorConstructor is ErrorConstructor & IV8ErrorConstructor {
	return (
		"captureStackTrace" in errorConstructor &&
		"stackTraceLimit" in errorConstructor
	);
}
