---
"@ac-kit/core": minor
---

New `nextUtf8Boundary(bytes, index)`, returning the first UTF-8 character
boundary at or after `index`.

Slicing a UTF-8 buffer at an arbitrary offset — a tail, a window, a chunk
handed to `decodeText` — can land inside a multi-byte sequence, whose orphaned
tail decodes to a leading U+FFFD. Aligning the offset forward drops the partial
character instead.
