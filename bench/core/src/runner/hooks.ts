import {
	registerAfterAll,
	registerAfterEach,
	registerBeforeAll,
	registerBeforeEach,
} from "./registry.js";

/** Registers a hook that runs once before all cases in the current condition. */
export const beforeAll = registerBeforeAll;

/**
 * Registers a hook that runs before each case iteration in the current
 * condition.
 */
export const beforeEach = registerBeforeEach;

/**
 * Registers a hook that runs after each case iteration in the current
 * condition.
 */
export const afterEach = registerAfterEach;

/** Registers a hook that runs once after all cases in the current condition. */
export const afterAll = registerAfterAll;
