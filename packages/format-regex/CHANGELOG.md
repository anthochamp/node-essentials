# @ac-kit/format-regex

## 0.2.0

### Minor Changes

- a5c4d66: Bound what a pattern may cost. `compileRegex` takes the new `RegexLimits`, and
  `compileProgram` and `execProgram` take the single bound each one enforces —
  `maxProgramSize` and `maxSteps`, as plain numbers.
  
  The linear-time matching guarantee was never a guarantee about space. A program
  is sized by the pattern — `a{1,200000}` emits one instruction per repetition
  before a character is read — and a run costs program size × input length, so a
  caller holding a pattern it did not write had a time bound and nothing else.
  
  `maxProgramSize` is enforced as the program is built, so it never grows past the
  bound rather than being measured after the fact; `maxSteps` bounds one run.
  Exceeding either throws `RegexLimitExceededError`, which names the bound it hit.
  Both default to `DEFAULT_REGEX_LIMITS`, high enough that no hand-written pattern
  over a realistic input reaches them, and both are options rather than constants
  so a caller holding a trusted pattern can raise them.
  
  `RegexLimits` is resolved exactly once, by `compileRegex`. The `test` and `exec`
  closures it returns hold the two resolved bounds, so a match does no option
  handling and allocates no options object before reading a character.

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/algo@0.2.0
  - @ac-kit/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/algo@0.1.1
