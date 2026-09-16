# @ac-kit/format-shell

Shell syntax as a format: the quoting rules a command line needs, and the
parsing and printing of environment variables.

Portable — no Node.js built-in is used, so a dialect or a syntax is always named
explicitly rather than read off the running platform.

## Installation

You can install the package via npm:

```bash
npm install @ac-kit/format-shell
```

Or via yarn:

```bash
yarn add @ac-kit/format-shell
```

## Command quoting

`escapeCommandArg(value, dialect)` makes a value safe as one argument;
`escapeCommand(command, dialect)` neutralizes the metacharacters of a whole
command line. Three dialects are covered — `posix-sh`, `win32-cmd` and
`powershell` — and each one's rule is also exported on its own
(`escapePosixShCommandArg`, `escapeWin32CmdCommand`, …).

```ts
import { escapeCommandArg, shellDialectForPlatform } from "@ac-kit/format-shell";

const dialect = shellDialectForPlatform(process.platform);

escapeCommandArg("It's a test", dialect); // 'It'\''s a test'
```

`unquotePosixShWord` reads a POSIX word back, whichever way it was spelled.

## Environment variables

`printEnv` and `parseEnv` handle a whole document; `printEnvAssignment` and
`parseEnvAssignment` handle one line. Four syntaxes are covered:

| syntax         | looks like            | for                                    |
| -------------- | --------------------- | -------------------------------------- |
| `assignment`   | `NAME=value`          | one `execve` entry — `env`, `docker --env` |
| `dotenv`       | `NAME="value"`        | a `.env` file                          |
| `posix-export` | `export NAME='value'` | a script to `source`                   |
| `win32-set`    | `set "NAME=value"`    | a batch file                           |

```ts
import { parseEnv, printEnv } from "@ac-kit/format-shell";

printEnv({ TOKEN: "a b", RETRIES: 3 }); // TOKEN="a b"\nRETRIES=3\n
parseEnv('TOKEN="a b"\n# comment\n');   // { TOKEN: "a b" }
```

Parsing always yields strings, because that is all an environment holds.
`parseEnvValueAsBool` and `parseEnvValueAsNumber` read one as something else
when the caller decides it means something else. `toProcessEnv` and
`fromProcessEnv` convert to and from the record `child_process.spawn` takes.

## Usage

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-shell/)
for the full reference.
