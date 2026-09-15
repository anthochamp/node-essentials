import { SetFieldType } from "type-fest";

/**
 * Type alias for the built-in Error type.
 *
 * Helps clarify the code to disambugate between the Error JS class and its
 * interface (type), which have the same name, which can be confusing when
 * referring to an object that looks like an Error but is not an instance of the
 * Error class.
 */
export type IError = Error;

/**
 * Type alias for the built-in AggregateError type.
 *
 * Helps clarify the code to disambugate between the AggregateError JS class and
 * its interface (type), which have the same name, which can be confusing when
 * referring to an object that looks like an AggregateError but is not an
 * instance of the AggregateError class.
 */
export type IAggregateError = SetFieldType<AggregateError, "errors", unknown[]>;

/**
 * Type alias for the built-in SuppressedError type.
 *
 * Helps clarify the code to disambugate between the SuppressedError JS class
 * and its interface (type), which have the same name, which can be confusing
 * when referring to an object that looks like an SuppressedError but is not an
 * instance of the SuppressedError class.
 */
export type ISuppressedError = SetFieldType<
	SuppressedError,
	"error" | "suppressed",
	unknown
>;
