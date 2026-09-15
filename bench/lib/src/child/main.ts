/**
 * Bench child entry point, forked as `@ac-bench/lib/child`.
 *
 * Imports `@ac-bench/core/runner` only — never `/plugin`: plugins are the
 * reporting side's concern and must never be loaded into a measuring process.
 */
import { pathToFileURL } from "node:url";

import {
	BENCH_PROTOCOL_VERSION,
	describeConditions,
	drainConditions,
	ParentHelloMessage,
	ParentMessage,
	parseParentMessage,
	ProtocolVersionMismatchError,
	resolveForkUnit,
	runForkUnit,
	StartMessage,
} from "@ac-bench/core/runner";

import { ChildChannel } from "./channel.js";
import { createChildEventSink } from "./event-sink.js";

const send = process.send?.bind(process);

if (send === undefined) {
	throw new Error("@ac-bench/lib/child must be forked with an IPC channel");
}

const channel = new ChildChannel(
	(message) =>
		new Promise<void>((resolve, reject) => {
			send(message, (error: unknown) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		}),
);

const controller = new AbortController();
const commands: ParentMessage[] = [];
let draining = false;

process.on("message", (raw: unknown) => {
	let message: ParentMessage;

	try {
		message = parseParentMessage(raw);
	} catch (error) {
		void channel.fatal(error);
		return;
	}

	switch (message.t) {
		case "ack":
			channel.acknowledge(message.seq);
			return;

		case "abort":
			controller.abort(new Error(message.reason));
			channel.release();
			return;

		default:
			commands.push(message);
			void drainCommands();
	}
});

async function drainCommands(): Promise<void> {
	if (draining) {
		return;
	}

	draining = true;

	try {
		for (
			let message = commands.shift();
			message !== undefined;
			message = commands.shift()
		) {
			await handleCommand(message);
		}
	} finally {
		draining = false;
	}
}

async function handleCommand(message: ParentMessage): Promise<void> {
	switch (message.t) {
		case "hello":
			await handleHello(message);
			return;

		case "list":
			await handleList(message.file);
			return;

		case "start":
			await handleStart(message);
			return;

		default:
			return;
	}
}

async function handleHello(message: ParentHelloMessage): Promise<void> {
	if (message.version !== BENCH_PROTOCOL_VERSION) {
		await channel.fatal(
			new ProtocolVersionMismatchError(BENCH_PROTOCOL_VERSION, message.version),
		);
		finish(1);
		return;
	}

	// The only channel a bench file loaded later can read these from.
	process.env.AC_BENCH_RUN_ID = message.runId;
	process.env.AC_BENCH_ARTIFACT_CACHE_ROOT = message.artifactCacheRoot;

	for (const setupFile of message.setupFiles ?? []) {
		try {
			await import(pathToFileURL(setupFile).href);
		} catch (error) {
			await channel.fatal(error);
			finish(1);
			return;
		}
	}

	await channel.hello();
}

async function handleList(file: string): Promise<void> {
	try {
		await import(pathToFileURL(file).href);
	} catch (error) {
		await channel.fatal(error);
		finish(1);
		return;
	}

	await channel.conditions(describeConditions(drainConditions()));
	finish(0);
}

async function handleStart(message: StartMessage): Promise<void> {
	try {
		await import(pathToFileURL(message.file).href);
	} catch (error) {
		await channel.fatal(error);
		finish(1);
		return;
	}

	const sink = createChildEventSink(channel);

	try {
		const unit = resolveForkUnit(
			drainConditions(),
			message.conditionPath,
			message.conditionTitles,
		);

		const outcome = await runForkUnit(unit, controller.signal, {
			sink,
			file: message.file,
			parentScopeId: message.parentScopeId,
			orderSeed: message.orderSeed,
			arm: message.arm,
			replicate: message.replicate,
			rounds: message.rounds,
			...(message.caseFilter ? { caseFilter: message.caseFilter } : {}),
			// The measure has no other channel for a run-level switch.
			measureOptions: {
				...message.measureOptions,
				emitSamples: message.emitSamples,
			},
		});

		await sink.close();
		await channel.done(outcome.status);
		finish(0);
	} catch (error) {
		await sink.close();
		await channel.fatal(error);
		finish(1);
	}
}

/**
 * Closes the channel and lets the process end on its own, so a benchmark that
 * leaked a handle shows up as the parent's heartbeat timeout instead of being
 * hidden by a hard exit.
 */
function finish(code: number): void {
	process.exitCode = code;
	process.disconnect?.();
}
