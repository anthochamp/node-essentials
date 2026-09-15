# website-kit

The documentation site for the `@ac-kit` packages, built with Astro and
Starlight. Private — not published to npm; it is deployed to GitHub Pages by
`.github/workflows/validate-n-publish.yml`.

```sh
yarn workspace website-kit run dev            # local server with hot reload
yarn workspace website-kit run build          # static build into dist/
yarn workspace website-kit run compile:check  # astro check
```

The site has three layers: subject-organised topic pages under
`src/content/docs/topics/`, interactive examples drawn from the `examples`
workspace, and an API reference generated from each package's TypeScript
sources.
