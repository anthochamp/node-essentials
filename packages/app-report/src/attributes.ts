import * as z from "zod/mini";

export const attributesSchema = z.record(z.string(), z.unknown());
/** Arbitrary key/value pairs attached to a scope or event. */
export type Attributes = z.infer<typeof attributesSchema>;

// Reserved namespaces: `source.` `process.` `run.` `scope.` `error.` `report.`.
// Unnamespaced keys are free for callers to use.

/** Source file path a scope/event originates from (e.g. a failing test). */
export const ATTR_SOURCE_FILE = "source.file";
/** 1-based source line number. */
export const ATTR_SOURCE_LINE = "source.line";
/** 1-based source column number. */
export const ATTR_SOURCE_COLUMN = "source.column";
/** Source function/method name. */
export const ATTR_SOURCE_FUNCTION = "source.function";

/** Command line of a spawned process scope. */
export const ATTR_PROCESS_COMMAND = "process.command";
/** Working directory of a spawned process scope. */
export const ATTR_PROCESS_CWD = "process.cwd";
/** Exit code of a finished process scope, `null` if terminated by a signal. */
export const ATTR_PROCESS_EXIT_CODE = "process.exitCode";
/** Signal that terminated a process scope, if any. */
export const ATTR_PROCESS_SIGNAL = "process.signal";

/** Identifier of the run a scope belongs to, for cross-run matching. */
export const ATTR_RUN_ID = "run.id";
/** Revision (e.g. git SHA) the run was produced from. */
export const ATTR_RUN_REVISION = "run.revision";

/** Coarse classification of a `scope-end` failure, e.g. "timeout". */
export const ATTR_ERROR_KIND = "error.kind";
