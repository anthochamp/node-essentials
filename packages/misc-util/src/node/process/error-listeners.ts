import { writeFileSync } from "node:fs";
import { EOL } from "node:os";
import { formatError } from "../../ecma/error/format-error.js";
import type { Callable } from "../../ecma/function/types.js";
import { defaults } from "../../ecma/object/defaults.js";

export class UnhandledRejectionEventError extends Error {
	readonly promise: Promise<unknown> | undefined;

	constructor(event: PromiseRejectionEvent) {
		super("Unhandled rejection", { cause: event.reason ?? event });

		this.promise = event?.promise;
		this.name = "UnhandledRejectionEventError";
	}
}

export class UncaughtExceptionEventError extends Error {
	readonly filename: string;
	readonly columnNumber: number;
	readonly lineNumber: number;

	constructor(event: ErrorEvent) {
		let location: string | undefined;
		if (event.filename) {
			location = `${event.filename}:${event.lineno}:${event.colno}`;
		}

		super(`Uncaught exception${location ? ` at (${location})` : ""}`, {
			cause: event.error ?? event.message,
		});

		this.filename = event.filename;
		this.columnNumber = event.colno;
		this.lineNumber = event.lineno;

		this.name = "UncaughtExceptionEventError";
	}
}

export type ErrorListenersOptions = {
	silent?: boolean;

	onUnhandledRejectionEventError?:
		| ((error: UnhandledRejectionEventError) => void)
		| null;

	onUncaughtExceptionEventError?:
		| ((error: UncaughtExceptionEventError) => void)
		| null;
};

const ERROR_LISTENERS_DEFAULT_OPTIONS: Required<ErrorListenersOptions> = {
	silent: false,
	onUnhandledRejectionEventError: null,
	onUncaughtExceptionEventError: null,
};

/**
 * A utility class that listens for unhandled promise rejections and uncaught
 * exceptions, logs them to a specified file, or if that fails, to stderr.
 */
export class ErrorListeners {
	private readonly options: Required<ErrorListenersOptions>;
	private detacher: Callable | null = null;

	/**
	 * Creates a new instance of LoggerErrorListeners.
	 *
	 * @param filePath The path to the file where errors will be logged.
	 * @param options The options for the LoggerErrorListeners.
	 */
	constructor(
		private readonly filePath: string,
		options?: ErrorListenersOptions,
	) {
		this.options = defaults(options, ERROR_LISTENERS_DEFAULT_OPTIONS);
	}

	/**
	 * Checks if the listeners are currently attached.
	 *
	 * @returns True if the listeners are currently attached, false otherwise.
	 */
	isAttached(): boolean {
		return this.detacher !== null;
	}

	/**
	 * Attaches the listeners for unhandled promise rejections and uncaught exceptions.
	 *
	 * If the listeners are already attached, this method does nothing.
	 */
	attach(): void {
		if (this.isAttached()) {
			return;
		}

		const unhandledRejectionHandler = this.handleUnhandledRejection.bind(this);
		const uncaughtExceptionHandler = this.handleUncaughtException.bind(this);

		process.on("unhandledRejection", unhandledRejectionHandler);
		process.on("uncaughtException", uncaughtExceptionHandler);

		this.detacher = () => {
			process.removeListener("unhandledRejection", unhandledRejectionHandler);
			process.removeListener("uncaughtException", uncaughtExceptionHandler);
		};
	}

	/**
	 * Detaches the listeners for unhandled promise rejections and uncaught exceptions.
	 *
	 * If the listeners are not attached, this method does nothing.
	 */
	detach(): void {
		this.detacher?.();
		this.detacher = null;
	}

	private handleError(
		error: UncaughtExceptionEventError | UnhandledRejectionEventError,
	) {
		const message = `[${new Date().toISOString()}] ${formatError(error, { stackTrace: true })}${EOL}`;
		try {
			writeFileSync(this.filePath, message, { flag: "a" });
		} catch {
			if (!this.options.silent) {
				process.stderr.write(message);
			}
		}
	}

	private handleUnhandledRejection(event: PromiseRejectionEvent) {
		const error = new UnhandledRejectionEventError(event);

		this.handleError(error);

		try {
			this.options.onUnhandledRejectionEventError?.(error);
		} catch {}
	}

	private handleUncaughtException(event: ErrorEvent) {
		const error = new UncaughtExceptionEventError(event);

		this.handleError(error);

		try {
			this.options.onUncaughtExceptionEventError?.(error);
		} catch {}
	}
}
