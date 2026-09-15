/**
 * One-iteration entry point for `execution: "per-iteration-process"`.
 *
 * Spawned fresh for every sample, with no IPC channel: its whole result is its
 * wall time and its exit code, so nothing in this file is inside the number
 * being reported except the work itself. The phase line it writes to stdout is
 * emitted after the case body has returned.
 */
import { pathToFileURL } from "node:url";

import {
	drainConditions,
	resolveForkUnit,
	runCaseOnce,
} from "@ac-bench/core/runner";

import {
	iterationPayloadSchema,
	SINGLE_ITERATION_OPTION,
} from "./_iteration-protocol.js";
import { ColdStartPhases } from "./_process-execution.js";

const [, , rawPayload] = process.argv;

if (rawPayload === undefined) {
	process.stderr.write("iteration child: missing payload argument\n");
	process.exit(2);
}

const payload = iterationPayloadSchema.parse(JSON.parse(rawPayload));

const importBegan = performance.now();
await import(pathToFileURL(payload.file).href);
const importEnded = performance.now();

const unit = resolveForkUnit(
	drainConditions(),
	payload.conditionPath,
	payload.conditionTitles,
);

// Cancellation reaches this process as a signal to its group, not through here.
const never = new AbortController().signal;

const runBegan = performance.now();
await runCaseOnce(unit, payload.caseTitle, never, {
	file: payload.file,
	measureOptions: { [SINGLE_ITERATION_OPTION]: true },
});
const runEnded = performance.now();

const { nodeStart, bootstrapComplete } = performance.nodeTiming;

const phases: ColdStartPhases = {
	startupMs: bootstrapComplete - nodeStart,
	importMs: importEnded - importBegan,
	runMs: runEnded - runBegan,
};

process.stdout.write(`${JSON.stringify(phases)}\n`);
