import {
	type ExecFileOptions,
	type ExecFileOptionsWithBufferEncoding,
	type ExecFileOptionsWithStringEncoding,
	type ExecOptions,
	type ExecOptionsWithBufferEncoding,
	type ExecOptionsWithStringEncoding,
	execFile as execFileSync,
	exec as execSync,
} from "node:child_process";
import { promisify } from "node:util";
import { isNodeExecErrorLike } from "../error/node-exec-error.js";
import { ProcessExitWithOutputError } from "./process-exit-error.js";

export const exec: typeof execSync.__promisify__ = promisify(execSync);
export const execFile: typeof execFileSync.__promisify__ =
	promisify(execFileSync);

export async function execAsync<
	O extends
		| ExecOptions
		| ExecOptionsWithBufferEncoding
		| ExecOptionsWithStringEncoding,
	R = O extends ExecOptionsWithStringEncoding
		? { stdout: string; stderr: string }
		: O extends ExecOptionsWithBufferEncoding
			? { stdout: Buffer; stderr: Buffer }
			: { stdout: string | Buffer; stderr: string | Buffer },
>(command: string, options?: O): Promise<R> {
	let result: R;

	try {
		result = (await exec(command, options)) as R;
	} catch (error) {
		if (isNodeExecErrorLike(error)) {
			throw ProcessExitWithOutputError.fromNodeExecError(error);
		}

		throw error;
	}

	return result;
}

export async function execFileAsync<
	O extends
		| ExecFileOptions
		| ExecFileOptionsWithBufferEncoding
		| ExecFileOptionsWithStringEncoding,
	R = O extends ExecFileOptionsWithStringEncoding
		? { stdout: string; stderr: string }
		: O extends ExecFileOptionsWithBufferEncoding
			? { stdout: Buffer; stderr: Buffer }
			: { stdout: string | Buffer; stderr: string | Buffer },
>(file: string, args?: ReadonlyArray<string>, options?: O): Promise<R> {
	let result: R;

	try {
		result = (await execFile(file, args, options)) as R;
	} catch (error) {
		if (isNodeExecErrorLike(error)) {
			throw ProcessExitWithOutputError.fromNodeExecError(error);
		}

		throw error;
	}

	return result;
}
