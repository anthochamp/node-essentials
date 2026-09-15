import type { defineProject as vitestDefineProject } from "vitest/config";

declare const defineProject: typeof vitestDefineProject;
export { defineProject };
