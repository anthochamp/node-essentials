import { writeFileSync } from "node:fs";
import { EOL } from "node:os";
import { formatError } from "../../ecma/error/format-error.js";
import type { Callable } from "../../ecma/function/types.js";
import { defaults } from "../../ecma/object/defaults.js";

/**
 * The origin of an uncaught exception.
 * Matches Node.js process 'uncaughtException' event callback.
 */
export type UncaughtExceptionOrigin =
	| "uncaughtException"
	| "unhandledRejection";

export class UnhandledRejectionError extends Error {
	constructor(
		reason: unknown,
		readonly promise: Promise<unknown> | null = null,
	) {
		super("Unhandled rejection", { cause: reason });

		this.name = "UnhandledRejectionError";
	}
}

export class UncaughtExceptionError extends Error {
	constructor(error: Error) {
		super("Uncaught exception", {
			cause: error,
		});

		this.name = "UncaughtExceptionError";
	}
}

export type ErrorListenersOptions = {
	silent?: boolean;

	onError?:
		| ((error: UnhandledRejectionError | UncaughtExceptionError) => void)
		| null;
};

const ERROR_LISTENERS_DEFAULT_OPTIONS: Required<ErrorListenersOptions> = {
	silent: false,
	onError: null,
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

	private handleError(error: UncaughtExceptionError | UnhandledRejectionError) {
		const message = `[${new Date().toISOString()}] ${formatError(error, { stackTrace: true })}${EOL}`;
		try {
			writeFileSync(this.filePath, message, { flag: "a" });
		} catch {
			if (!this.options.silent) {
				process.stderr.write(message);
			}
		}
	}

	private handleUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
		try {
			const wrappedError = new UnhandledRejectionError(reason, promise);

			this.handleError(wrappedError);

			this.options.onError?.(wrappedError);
		} catch {}
	}

	private handleUncaughtException(
		error: Error,
		origin: UncaughtExceptionOrigin,
	) {
		try {
			let wrappedError: UnhandledRejectionError | UncaughtExceptionError;
			if (origin === "unhandledRejection") {
				wrappedError = new UnhandledRejectionError(error);
			} else {
				wrappedError = new UncaughtExceptionError(error);
			}

			this.handleError(wrappedError);

			this.options.onError?.(wrappedError);
		} catch {}
	}
}
