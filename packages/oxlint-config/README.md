# @ac-essentials/oxlint-config

This package provides reusable, shareable oxlint and oxfmt configurations for
Node.js and TypeScript projects. It's mainly for my own workflow, but you're
welcome to use it if it fits your needs! The goal: keep your codebase clean,
consistent, and easy to maintain—without having to copy-paste config everywhere.

## What does it do?

- Exports an oxlint config (as JSON) with type-aware linting rules for
  TypeScript projects.
- Exports an oxfmt config (as JSON) with consistent formatting options.
- Lets you enforce consistent linting and formatting in all your projects with
  almost zero setup.
- Makes it easy to update rules everywhere at once.

## How do I use it?

### oxlint

1. **Install it:**

   ```sh
   yarn add -D @ac-essentials/oxlint-config
   # or
   npm install --save-dev @ac-essentials/oxlint-config
   ```

2. **Reference it in your `.oxlintrc.json`:**

   ```json
   {
     "extends": ["@ac-essentials/oxlint-config"]
   }
   ```

3. **Run oxlint:**

   ```sh
   npx oxlint .
   ```

### oxfmt

1. **Install it** (same package as above).

2. **Reference it in your `.oxfmtrc.json`:**

   ```json
   {
     "extends": ["@ac-essentials/oxlint-config/oxfmtrc"]
   }
   ```

3. **Run oxfmt:**

   ```sh
   npx oxfmt .
   ```
