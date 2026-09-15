# @ac-kit/fixture-crypto

NIST CAVP, Wycheproof and RFC known-answer vectors for the `crypto-*` test
suites. A fetch script acquires them on demand rather than committing the
corpora or vendoring them as git submodules: the vectors are large, they are
published and versioned upstream already, and a submodule would force every
clone to pay for them whether or not it runs the tests.

Private, `devDependency` only, never a runtime dependency.
