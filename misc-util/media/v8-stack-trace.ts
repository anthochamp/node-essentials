export type V8StackFrame = {
	// the value of this
	this: unknown;
	// the type of this as a string. This is the name of the function stored in the constructor field of this, if available, otherwise the object’s [[Class]] internal property.
	typeName: string | null;
	// the current function
	// biome-ignore lint/complexity/noBannedTypes: intended
	function: Function | undefined;
	// the name of the current function, typically its name property. If a name property is not available an attempt is made to infer a name from the function’s context.
	functionName: string | null;
	// the name of the property of this or one of its prototypes that holds the current function
	methodName: string | null;

	//if this function was defined in a script returns the name of the script
	fileName: string | null;
	// if this function was defined in a script returns the current line number
	lineNumber: number | null;
	// if this function was defined in a script returns the current column number
	columnNumber: number | null;
	// if this function was created using a call to eval returns a string representing the location where eval was called
	evalOrigin: string | undefined;

	// is this a top-level invocation, that is, is this the global object?
	toplevel: boolean;
	// does this call take place in code defined by a call to eval?
	eval: boolean;
	// is this call in native V8 code?
	native: boolean;
	// is this a constructor call?
	constructor: boolean;
	// is this an async call (i.e. await, Promise.all(), or Promise.any())?
	async: boolean;
	// is this an async call to Promise.all()?
	promiseAll: boolean;
	// the index of the promise element that was followed in Promise.all() or Promise.any() for async stack traces, or null if the CallSite is not an async Promise.all() or Promise.any() call.
	promiseIndex: number | null;

	// others
	enclosingColumnNumber: number | null;
	enclosingLineNumber: number | null;
	position: number;
	scriptHash: string;
	scriptNameOrSourceURL: string | null;
};

export type V8StackTrace = V8StackFrame[];

// https://v8.dev/docs/stack-trace-api#customizing-stack-traces
export function composeV8StackFrameFromV8CallSite(
	callSite: NodeJS.CallSite,
): V8StackFrame {
	return {
		this: callSite.getThis(),
		typeName: callSite.getTypeName(),
		function: callSite.getFunction(),
		functionName: callSite.getFunctionName(),
		methodName: callSite.getMethodName(),
		fileName: callSite.getFileName(),
		lineNumber: callSite.getLineNumber(),
		columnNumber: callSite.getColumnNumber(),
		evalOrigin: callSite.getEvalOrigin(),
		toplevel: callSite.isToplevel(),
		eval: callSite.isEval(),
		native: callSite.isNative(),
		constructor: callSite.isConstructor(),
		async: callSite.isAsync(),
		promiseAll: callSite.isPromiseAll(),
		promiseIndex: callSite.getPromiseIndex(),
		enclosingColumnNumber: callSite.getEnclosingColumnNumber(),
		enclosingLineNumber: callSite.getEnclosingLineNumber(),
		position: callSite.getPosition(),
		scriptHash: callSite.getScriptHash(),
		scriptNameOrSourceURL: callSite.getScriptNameOrSourceURL(),
	};
}
