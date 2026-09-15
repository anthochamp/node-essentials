/**
 * Real-world ASN.1 module fixtures used for parser integration tests. Text
 * sourced from RFCs and ITU-T standards.
 */

/**
 * Minimal PKIX module — AlgorithmIdentifier and related types. Simplified from
 * RFC 5280 §4.1.1.2.
 */
export const PKIX_ALGORITHM_MODULE = `\
PKIX1Algorithms2008 { iso(1) identified-organization(3) dod(6)
    internet(1) security(5) mechanisms(5) pkix(7) id-mod(0) 44 }

DEFINITIONS IMPLICIT TAGS ::=

BEGIN

IMPORTS
    ;

AlgorithmIdentifier { ALGORITHM-ID:InfoObjectSet } ::= SEQUENCE {
    algorithm  ALGORITHM-ID.&id({InfoObjectSet}),
    parameters ALGORITHM-ID.&Type({InfoObjectSet}{@algorithm}) OPTIONAL
}

END
`;

/** Simple SEQUENCE types — covers the most common certificate fields. */
export const SIMPLE_SEQUENCE_MODULE = `\
SimpleTest DEFINITIONS EXPLICIT TAGS ::= BEGIN

Version ::= INTEGER { v1(0), v2(1), v3(2) }

CertificateSerialNumber ::= INTEGER

Validity ::= SEQUENCE {
    notBefore Time,
    notAfter  Time
}

Time ::= CHOICE {
    utcTime      UTCTime,
    generalTime  GeneralizedTime
}

END
`;

/** X.501 Name types used in X.509 certificates (simplified). */
export const X501_NAME_MODULE = `\
InformationFramework { joint-iso-itu-t ds(5) module(1) informationFramework(1) 9 }

DEFINITIONS IMPLICIT TAGS ::= BEGIN

IMPORTS
    ;

DistinguishedName ::= RDNSequence

RDNSequence ::= SEQUENCE OF RelativeDistinguishedName

RelativeDistinguishedName ::=
    SET SIZE (1..MAX) OF AttributeTypeAndValue

AttributeTypeAndValue ::= SEQUENCE {
    type     AttributeType,
    value    AttributeValue
}

AttributeType ::= OBJECT IDENTIFIER

AttributeValue ::= ANY

END
`;

/** SubjectPublicKeyInfo from RFC 5280 §4.1.2.7 (simplified). */
export const SUBJECT_PUBLIC_KEY_INFO_MODULE = `\
PKIX1Explicit88 { iso(1) identified-organization(3) dod(6)
    internet(1) security(5) mechanisms(5) pkix(7) id-mod(0) 18 }

DEFINITIONS EXPLICIT TAGS ::= BEGIN

AlgorithmIdentifier ::= SEQUENCE {
    algorithm   OBJECT IDENTIFIER,
    parameters  ANY OPTIONAL
}

SubjectPublicKeyInfo ::= SEQUENCE {
    algorithm        AlgorithmIdentifier,
    subjectPublicKey BIT STRING
}

Certificate ::= SEQUENCE {
    tbsCertificate      TBSCertificate,
    signatureAlgorithm  AlgorithmIdentifier,
    signature           BIT STRING
}

TBSCertificate ::= SEQUENCE {
    version         [0] EXPLICIT INTEGER { v1(0), v2(1), v3(2) } DEFAULT v1,
    serialNumber    INTEGER,
    signature       AlgorithmIdentifier,
    issuer          Name,
    validity        Validity,
    subject         Name,
    subjectPublicKeyInfo SubjectPublicKeyInfo,
    issuerUniqueID  [1] IMPLICIT BIT STRING OPTIONAL,
    subjectUniqueID [2] IMPLICIT BIT STRING OPTIONAL,
    extensions      [3] EXPLICIT Extensions OPTIONAL
}

Validity ::= SEQUENCE {
    notBefore  Time,
    notAfter   Time
}

Time ::= CHOICE {
    utcTime      UTCTime,
    generalTime  GeneralizedTime
}

Name ::= CHOICE {
    rdnSequence RDNSequence
}

RDNSequence ::= SEQUENCE OF RelativeDistinguishedName

RelativeDistinguishedName ::= SET SIZE (1..MAX) OF AttributeTypeAndValue

AttributeTypeAndValue ::= SEQUENCE {
    type   OBJECT IDENTIFIER,
    value  ANY
}

Extensions ::= SEQUENCE OF Extension

Extension ::= SEQUENCE {
    extnID      OBJECT IDENTIFIER,
    critical    BOOLEAN DEFAULT FALSE,
    extnValue   OCTET STRING
}

END
`;
