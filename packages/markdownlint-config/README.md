# @ac-kit/markdownlint-config

This package gives you a ready-to-use, shareable markdownlint configuration for
Node.js and TypeScript projects. It's mainly for my own workflow, but you're
welcome to use it if it fits your needs! The goal: keep markdown files clean,
readable, and consistent across all your repos—without having to copy-paste
config everywhere.

## What does it do?

- Exports a markdownlint config (as JSON or JS) with a set of sensible rules and
  style preferences.
- Lets you enforce consistent markdown style in all your projects with almost
  zero setup.
- Makes it easy to update markdownlint rules everywhere at once.

## How do I use it?

1. **Install it:**

   ```sh
   yarn add -D @ac-kit/markdownlint-config
   # or
   npm install --save-dev @ac-kit/markdownlint-config
   ```

2. **Reference it in your `.markdownlint.json` or `.markdownlint.yaml`:**

   ```json
   {
     "extends": "@ac-kit/markdownlint-config"
   }
   ```

   Or in `.markdownlint-cli2.jsonc`:

   ```jsonc
   {
     "config": "@ac-kit/markdownlint-config",
   }
   ```

3. **Run markdownlint:**

   ```sh
   npx markdownlint .
   # or with markdownlint-cli2
   npx markdownlint-cli2 .
   ```

## Summary of Applied Options

### Default Rules (from markdownlint)

- Enforces consistent heading styles (ATX, no consecutive blank lines, etc.)
- Requires blank lines before/after headings and lists
- Disallows trailing spaces and hard tabs
- Requires fenced code blocks to use backticks
- Enforces ordered/unordered list style consistency
- Disables rules that conflict with common documentation practices (e.g., inline
  HTML allowed)

### Explicitly Set in This Config

- `default`: Enabled (all other default rules are active unless overridden)
- `MD013/line-length`: Disabled (no line length limit)
- `MD024/no-duplicate-heading`: Enabled with `siblings_only: true` (only checks
  for duplicate headings among sibling headings)

See the actual config file for the full list of enabled/disabled rules and their
settings.

## References

- ["If you can't measure it, you can't manage it." [A brief analysis of markdownlint rule popularity]](https://dlaa.me/blog/post/markdownlintanalyzeconfig)
  by David Anson
- See the actual config file in `packages/markdownlint-config/` for details
