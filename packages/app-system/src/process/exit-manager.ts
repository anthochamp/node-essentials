import {
	catchOutOfBand,
	catchOutOfBandAsync,
	type Callable,
	type MaybeAsyncCallable,
} from "@ac-kit/core";
import { PriorityQueue } from "@ac-kit/data";

export enum ExitManagerPriority {
	VERY_EARLY = 300,
	EARLY = 200,
	VERY_HIGH = 100,
	HIGH = 50,
	NORMAL = 0,
	LOW = -50,
	VERY_LOW = -100,
	LATE = -200,
	VERY_LATE = -300,
}

export class ExitManager {
	private static instance: ExitManager | null = null;
	static getInstance(): ExitManager {
		if (!ExitManager.instance) {
			ExitManager.instance = new ExitManager();
		}
		return ExitManager.instance;
	}

	private exitHandlers = new PriorityQueue<Callable>();
	private cleanUpHandlers = new PriorityQueue<MaybeAsyncCallable>();

	private constructor() {
		process.on("beforeExit", async () => {
			let handler: MaybeAsyncCallable | undefined;
			while ((handler = this.cleanUpHandlers.extract()) !== undefined) {
				await catchOutOfBandAsync(handler);
			}
		});

		process.on("exit", () => {
			let handler: Callable | undefined;
			while ((handler = this.exitHandlers.extract()) !== undefined) {
				catchOutOfBand(handler);
			}
		});
	}

	/**
	 * Register a possibly asynchronous clean-up handler to be called when the
	 * process is exiting.
	 *
	 * Note: The handler can be an asynchronous function. The process will wait
	 * for the promise to resolve before exiting.
	 *
	 * @param handler A function to be called on process exit.
	 * @param priority The priority of the clean-up handler.
	 */
	registerCleanUpHandler(
		handler: MaybeAsyncCallable,
		priority: ExitManagerPriority = 0,
	): Callable {
		this.cleanUpHandlers.insert(priority, handler);

		return () => this.unregisterCleanUpHandler(handler);
	}

	/**
	 * Unregister a previously registered clean-up handler.
	 *
	 * @param handler A function to be removed from the clean-up handlers.
	 * @param priority The priority of the clean-up handler. (optional, for
	 *   disambiguation)
	 */
	unregisterCleanUpHandler(
		handler: MaybeAsyncCallable,
		priority?: ExitManagerPriority,
	): void {
		this.cleanUpHandlers.remove(
			(f, p) => f === handler && (priority === undefined || p === priority),
		);
	}

	/**
	 * Registers a synchronous exit handler to be called when the process is
	 * exiting.
	 *
	 * Note: The handler should be a synchronous function. Asynchronous operations
	 * may not complete before the process exits.
	 *
	 * @param handler A synchronous function to be called on process exit.
	 * @param priority The priority of the exit handler.
	 */
	registerExitHandler(
		handler: Callable,
		priority: ExitManagerPriority = ExitManagerPriority.NORMAL,
	): Callable {
		this.exitHandlers.insert(priority, handler);

		return () => this.unregisterExitHandler(handler);
	}

	/**
	 * Unregister a previously registered exit handler.
	 *
	 * @param handler A function to be removed from the exit handlers.
	 * @param priority The priority of the exit handler. (optional, for
	 *   disambiguation)
	 */
	unregisterExitHandler(
		handler: Callable,
		priority?: ExitManagerPriority,
	): void {
		this.exitHandlers.remove(
			(f, p) => f === handler && (priority === undefined || p === priority),
		);
	}
}
