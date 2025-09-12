# @ac-essentials/markdownlint-cli2-config

This package provides a ready-to-use, shareable configuration for markdownlint-cli2, tailored for Node.js and TypeScript projects. It's mainly for my own workflow, but you're welcome to use it if it fits your needs! The goal: keep markdown files clean, readable, and consistent across all your repos—without having to copy-paste config everywhere.

## What does it do?

- Exports a markdownlint-cli2 config (as JSON or JS) with a set of sensible rules and style preferences.
- Lets you enforce consistent markdown style in all your projects with almost zero setup.
- Makes it easy to update markdownlint rules everywhere at once.

## How do I use it?

1. **Install it:**

   ```sh
   yarn add -D @ac-essentials/markdownlint-cli2-config
   # or
   npm install --save-dev @ac-essentials/markdownlint-cli2-config
   ```

2. **Reference it in your `.markdownlint-cli2.jsonc` or CLI2 config:**

   ```jsonc
   {
     "config": "@ac-essentials/markdownlint-cli2-config"
   }
   ```

3. **Run markdownlint-cli2:**

   ```sh
   npx markdownlint-cli2 .
   ```

## Summary of Applied Options

### Default Rules (from markdownlint-cli2)

- Enforces consistent heading styles (ATX, no consecutive blank lines, etc.)
- Requires blank lines before/after headings and lists
- Disallows trailing spaces and hard tabs
- Requires fenced code blocks to use backticks
- Enforces ordered/unordered list style consistency
- Disables rules that conflict with common documentation practices (e.g., inline HTML allowed)

### Explicitly Set in This Config

- `config`: Uses `@ac-essentials/markdownlint-config` as the base markdownlint ruleset
- `gitignore`: Enabled, so files ignored by `.gitignore` are skipped
- `globs`: Only files matching `**/*.{md,mdx}` are linted

See the actual config file for the full list of enabled/disabled rules and their settings.

## References

- ["If you can't measure it, you can't manage it." [A brief analysis of markdownlint rule popularity]](https://dlaa.me/blog/post/markdownlintanalyzeconfig) by David Anson
- See the actual config file in `packages/markdownlint-cli2-config/` for details

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
