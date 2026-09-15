# @ac-kit/math-signal

Digital signal processing: Fourier analysis, convolution, filtering and window
functions over uniformly sampled sequences.

## Scope

Where `@ac-kit/math-analysis` takes a callable and approximates a continuous
operation, this package takes an **array of samples** and operates on the
sequence itself. Everything here assumes a uniform sampling interval.

Complex arithmetic comes from `@ac-kit/math-complex`.

## Contents

| Symbol                   | Sidelobe | Rolloff      |
| ------------------------ | -------- | ------------ |
| `hannWindow(length)`     | −31 dB   | 18 dB/octave |
| `hammingWindow(length)`  | −43 dB   | 6 dB/octave  |
| `blackmanWindow(length)` | −58 dB   | 18 dB/octave |

## Why windows come first

Taking a finite slice of a signal is already a multiplication by a rectangular
window, whose spectrum is a sinc with −13 dB sidelobes. That leakage smears
energy across the whole spectrum and will hide any component more than about 20
dB below its neighbour. Applying a tapered window before a transform is not an
optional refinement; it is what makes the result readable.

The three provided windows trade sidelobe suppression against main-lobe width:
Hann is the general default, Hamming minimises the first sidelobe at the cost of
a slower rolloff, and Blackman buys dynamic range with a wider main lobe.

## Usage

```ts
import { hannWindow } from "@ac-kit/math-signal";

const window = hannWindow(1024);
const windowed = samples.map((s, i) => s * window[i]!);
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-signal/)
for the full reference.
