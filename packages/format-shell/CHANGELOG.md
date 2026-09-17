# @ac-kit/format-shell

## 0.1.1

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0

## 0.1.0

### Minor Changes

- a493b4a: New package: shell syntax as a format — command-line quoting and environment
  variable parsing and printing, extracted from `@ac-kit/core` and redesigned.
  
  - `escapeCommandArg(value, dialect)` and `escapeCommand(command, dialect)`
    dispatch over a `ShellDialect` naming the shell language, not the operating
    system: `posix-sh`, `win32-cmd` and `powershell` are all implemented, and
    `shellDialectForPlatform(platform)` maps a platform string to the default
    shell there without the package itself touching `node:process`.
  - `unquotePosixShWord` reads a POSIX word back whichever way it was spelled,
    inverting `escapePosixShCommandArg`.
  - `printEnv`/`parseEnv` handle a whole document and `printEnvAssignment`/
    `parseEnvAssignment` one line, in four syntaxes: the bare `NAME=value` of an
    `execve` entry, a `.env` file, a POSIX `export` statement and a cmd.exe `set`.
    Each quotes its values so that what was printed is what is read back, which
    `stringifyEnvVariable` never did — a value holding a space, a quote or a
    newline used to produce a broken line.
  - Parsing yields strings, because that is all an environment holds.
    `parseEnvValueAsBool` and `parseEnvValueAsNumber` read one as something else
    at the call site that knows it means one.
  - `toProcessEnv`/`fromProcessEnv` convert to and from the record
    `child_process.spawn` accepts.

### Patch Changes

- a493b4a: Store a parsed key named `__proto__` as an ordinary entry rather than letting it
  reach the prototype setter: CBOR map keys in `dataValueToJson`, unrecognised
  `.editorconfig` properties, and ASN.1 component names in the BER, CER, DER and
  PER decoders. `format-shell` already did this through a local helper, which is
  now `@ac-kit/core`'s `setRecordEntry`.
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
