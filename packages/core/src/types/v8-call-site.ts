/**
 * Structural equivalent of `NodeJS.CallSite` (from `@types/node`), declared
 * locally so this package never depends on Node's ambient types — the V8 stack
 * trace API it describes is available in any V8 embedder (Node, Chrome,
 * Electron, Deno), not just Node.
 *
 * @see https://v8.dev/docs/stack-trace-api
 */
export type V8CallSite = {
	// the value of this
	getThis(): unknown;
	// the type of this as a string. This is the name of the function stored in the constructor field of this, if available, otherwise the object’s [[Class]] internal property.
	getTypeName(): string | null;
	// the current function
	getFunction(): Function | undefined;
	// the name of the current function, typically its name property. If a name property is not available an attempt is made to infer a name from the function’s context.
	getFunctionName(): string | null;
	// the name of the property of this or one of its prototypes that holds the current function
	getMethodName(): string | null;

	// if this function was defined in a script returns the name of the script
	getFileName(): string | null;
	// if this function was defined in a script returns the current line number
	getLineNumber(): number | null;
	// if this function was defined in a script returns the current column number
	getColumnNumber(): number | null;
	// if this function was created using a call to eval returns a string representing the location where eval was called
	getEvalOrigin(): string | undefined;

	// is this a top-level invocation, that is, is this the global object?
	isToplevel(): boolean;
	// does this call take place in code defined by a call to eval?
	isEval(): boolean;
	// is this call in native V8 code?
	isNative(): boolean;
	// is this a constructor call?
	isConstructor(): boolean;
	// is this an async call (i.e. await, Promise.all(), or Promise.any())?
	isAsync(): boolean;
	// is this an async call to Promise.all()?
	isPromiseAll(): boolean;
	// the index of the promise element that was followed in Promise.all() or Promise.any() for async stack traces, or null if the CallSite is not an async Promise.all() or Promise.any() call.
	getPromiseIndex(): number | null;

	// others
	getEnclosingColumnNumber(): number | null;
	getEnclosingLineNumber(): number | null;
	getPosition(): number;
	getScriptHash(): string;
	getScriptNameOrSourceURL(): string | null;

	toString(): string;
};
