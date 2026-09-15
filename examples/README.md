# examples

Runnable documentation examples for the `@ac-kit` packages. Private — not
published. Every example here is rendered by the documentation site in
`website/kit`, with its source shown beside its output.

One example is a module exporting an `Example`: a title, a description, the
controls a reader may move, and a pure `run` that turns those control values
into an `ExampleView`. Nothing in this package knows how a view is drawn.

```sh
yarn workspace examples run test            # golden values for every example
yarn workspace examples run compile:check   # type-check against HEAD of every package
```
