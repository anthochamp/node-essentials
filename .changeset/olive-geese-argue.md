---
"@ac-kit/node": minor
---

`ProcessExitWithOutputError`'s message now carries the failing command's output.

- `stderr` is appended when it holds anything but whitespace, `stdout`
  otherwise. Previously the message stopped at the exit status, so a rejected
  `execAsync` or `spawnProcess` reported `Process exited with code 1` and
  nothing about why.
- Only the tail is kept, and the header states how much of the whole it is:
  `stderr (last 32768 of 40000 characters):`. `stdout` and `stderr` still carry
  the untruncated output.
- New `maxOutputLength` option on the constructor, defaulting to `32768`. It
  counts characters for string output and bytes for `Buffer` output, where a cut
  landing inside a UTF-8 sequence moves forward to the next character boundary
  so the tail never starts with a replacement character. A `Buffer` is sliced
  before it is decoded, so a large capture is never turned into a string in
  full.
- Code matching on the exact message string has to match a prefix instead.
