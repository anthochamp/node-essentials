/** Environment captured at run time, carried into live tables and exports. */
export function currentEnvironment(): {
	runtime: string;
	platform: string;
	arch: string;
	timestamp: string;
} {
	return {
		runtime: `node ${process.version}`,
		platform: process.platform,
		arch: process.arch,
		timestamp: new Date().toISOString(),
	};
}
