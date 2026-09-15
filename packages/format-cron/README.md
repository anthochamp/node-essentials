# @ac-kit/format-cron

A cron expression lexer, parser, printer, and scheduling codec.

```ts
import {
  parseCron,
  printCron,
  cronMatches,
  nextRun,
} from "@ac-kit/format-cron";

const schedule = parseCron("*/15 9-17 * * MON-FRI");

printCron(schedule); // "*/15 9-17 * * 1-5"

cronMatches(schedule, new Date()); // true/false

nextRun(schedule, new Date()); // next matching Date
```

Supported field syntax: `*`, `*/step`, `value`, `value-value`,
`value-value/step`, `value/step` (shorthand for `value-max/step`), and
comma-separated lists of the above. Month and day-of-week names (`JAN`–`DEC`,
`SUN`–`SAT`, case-insensitive) are accepted where numbers are.

Out of scope: seconds and year fields, and the Quartz-style `L`, `W` and `#`
extensions. This parses the five-field Vixie-cron dialect that crontab itself
accepts, not a superset one particular scheduler added.

When both day-of-month and day-of-week are restricted (neither is `*`), a date
matches if it satisfies _either_ field, per standard Vixie-cron semantics.
`nextRun` reads and returns dates in local time.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-cron/)
for the full reference.
