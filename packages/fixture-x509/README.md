# @ac-kit/fixture-x509

NIST PKITS, OpenSSL, BouncyCastle-java and pyca/cryptography certificate
corpora. A fetch script acquires them on demand rather than committing the
corpora or vendoring them as git submodules: the certificates are large, they
are published and versioned upstream already, and a submodule would force every
clone to pay for them whether or not it runs the tests.

Private, `devDependency` only, never a runtime dependency.
