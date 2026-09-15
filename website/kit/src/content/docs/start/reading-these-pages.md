---
title: Reading these pages
description: How the subject guide, the interactive examples and the generated API reference fit together.
sidebar:
  order: 1
---

These pages come in three layers, and they answer different questions.

## The guide, organised by subject

The sections in the sidebar — **Mathematics** and, in time, its siblings — are
organised by what you are trying to do, not by which package it lives in. A
reader who needs to find where a function crosses zero does not know that root
finding is published as `@ac-kit/math-analysis`, and a table of contents made of
npm names cannot tell them.

The consequence is that one package can supply several sections, and one section
can draw on several packages. Every page therefore states its import line at the
top, next to a tag saying whether that package runs anywhere or only under Node.

Pages open with a plain-language explanation before any formula. They are
written for someone who is competent but not a specialist in that subject; where
you want the real thing, a **Further reading** block at the end points at both an
accessible source and an authoritative one.

## Interactive examples

Most pages carry at least one **interactive example**. It runs in your browser:
the controls above the chart change the arguments, and the chart is recomputed
by the same package you would install from npm. Nothing is precomputed, and
nothing is mocked.

Examples come in two kinds, and each says which it is:

- An **illustration** shows what the thing typically produces.
- A figure badged **Evidence** demonstrates one specific measurable claim the
  surrounding prose makes — an error bound, a growth rate, a precision cliff.

The snippet under a chart is not a transcription. The site reads it out of the
example's own source file, between the markers that file uses to delimit it, so
it cannot drift from what actually ran.

Those files live in the repository's `examples` workspace. They are type-checked
against the current source of every package they import, and every evidence
figure is covered by a test asserting the same sentence the caption shows — if a
page says the error quarters when the panel count doubles, a test says so too,
and a regression breaks the build rather than quietly changing the picture.

## Reference

Three lookup axes, for when you already know what you are after:

- **API reference** — the complete exported surface of each package, generated
  from its TypeScript sources and doc comments. The exact signature, the
  overloads, the thrown errors. It is written for someone who already knows what
  they are looking at; the guide is where that context lives.
- **Packages** — every package in the tree, what it is for, where it runs, and a
  link into its reference. Start here when you have a name and need a page.
- **Glossary** — the domain terms these pages use, defined once in plain
  language.

Any symbol named in the guide links straight into the reference.

## Portability

Every package is tagged portable or host-bound.

- **Portable** — no `node:` import, no native binding. Runs unchanged in Node,
  browsers, Deno, Bun and edge runtimes.
- **Host-bound** — needs system access, so it runs only where that access
  exists.

A portable package may never depend on a host-bound one. That is what lets the
examples on this site run at all: they import the real packages, in a browser,
with no shims.
