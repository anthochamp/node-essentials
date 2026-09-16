---
"@ac-kit/app-logger": patch
"@ac-kit/app-system": patch
"@ac-kit/cmd-git": patch
---

Follow the shell helpers to `@ac-kit/format-shell`. No behaviour change: the
quoting rules and the boolean reading are the same functions under new homes,
with the shell dialect now named explicitly instead of being read off
`process.platform` inside `@ac-kit/node`.
