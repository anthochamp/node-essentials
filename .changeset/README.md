# Changesets

This directory holds the pending release notes for the next version bump.

Every change that affects a published package needs a changeset. Run:

```sh
yarn changeset
```

Pick the affected packages, pick a bump level for each, and write the line that
should appear in their changelogs. That writes a markdown file here, which is
committed alongside the code change.

At release time:

```sh
yarn changeset:version   # apply bumps, rewrite CHANGELOG.md, delete consumed changesets
yarn changeset:publish   # build, then publish everything not already on npm
```

Private workspaces are never versioned, tagged or published.
