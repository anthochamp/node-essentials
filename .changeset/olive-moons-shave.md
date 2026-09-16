---
"@ac-kit/core": minor
---

**Breaking:** the shell quoting and environment variable helpers have moved to
the new `@ac-kit/format-shell`.

Moved as-is: `escapePosixShSqe`, `escapePosixShCommandArg`,
`escapePosixShCommand`, `escapeWin32CmdCommandArg`, `escapeWin32CmdCommand`.

Moved and reshaped — see the `@ac-kit/format-shell` entry for why:
`stringifyEnvVariable` is `printEnvAssignment`, `stringifyEnvVariableValue` is
`printEnvValue`, `stringifyEnvVariableBoolValue` is `printEnvBoolValue`,
`parseEnvVariable` is `parseEnvAssignment`, and `parseEnvVariableValueAsBool`
and `parseEnvVariableValueAsNumber` drop `Variable` from their names.
`parseEnvVariableValue` and `parseEnvVariableValueAsString` are gone: parsing no
longer guesses a type, so `FOO=42` reads as `"42"` rather than `42`.
