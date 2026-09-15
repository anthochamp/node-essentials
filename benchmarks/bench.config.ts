import { defineConfig } from "@ac-bench/cli";
import constantTimeAdapter from "@ac-bench/measure-constant-time/plugin";
import durationAdapter from "@ac-bench/measure-duration/plugin";
import jitterAdapter from "@ac-bench/measure-jitter/plugin";
import resourceAdapter from "@ac-bench/measure-resource/plugin";

export default defineConfig({
	plugins: [
		durationAdapter,
		jitterAdapter,
		constantTimeAdapter,
		resourceAdapter,
	],
});
