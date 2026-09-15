/**
 * Full X.509v3 Certificate RFC 5280 ASN.1 schema. This is the complete module
 * definition used in real TLS/SSL certificates.
 */
export const RFC5280_CERTIFICATE_MODULE = `\
PKIX1Explicit88 { iso(1) identified-organization(3) dod(6)
    internet(1) security(5) mechanisms(5) pkix(7) id-mod(0) 18 }

DEFINITIONS EXPLICIT TAGS ::=

BEGIN

-- Basic Certificate types

Certificate  ::=  SEQUENCE  {
    tbsCertificate       TBSCertificate,
    signatureAlgorithm   AlgorithmIdentifier,
    signatureValue       BIT STRING
}

TBSCertificate  ::=  SEQUENCE  {
    version         [0]  EXPLICIT Version DEFAULT v1,
    serialNumber         CertificateSerialNumber,
    signature            AlgorithmIdentifier,
    issuer               Name,
    validity             Validity,
    subject              Name,
    subjectPublicKeyInfo SubjectPublicKeyInfo,
    issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
    subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
    extensions      [3]  EXPLICIT Extensions OPTIONAL
}

Version  ::=  INTEGER  {  v1(0), v2(1), v3(2)  }

CertificateSerialNumber  ::=  INTEGER

Validity ::= SEQUENCE {
    notBefore      Time,
    notAfter       Time }

Time ::= CHOICE {
    utcTime        UTCTime,
    generalTime    GeneralizedTime }

UniqueIdentifier  ::=  BIT STRING

SubjectPublicKeyInfo  ::=  SEQUENCE  {
    algorithm            AlgorithmIdentifier,
    subjectPublicKey     BIT STRING  }

AlgorithmIdentifier  ::=  SEQUENCE  {
    algorithm               OBJECT IDENTIFIER,
    parameters              ANY OPTIONAL  }

-- X.501 Name types

Name ::= CHOICE {
    rdnSequence  RDNSequence }

RDNSequence ::= SEQUENCE OF RelativeDistinguishedName

RelativeDistinguishedName ::=
    SET SIZE (1..MAX) OF AttributeTypeAndValue

AttributeTypeAndValue ::= SEQUENCE {
    type     AttributeType,
    value    AttributeValue }

AttributeType ::= OBJECT IDENTIFIER

AttributeValue ::= ANY

-- Extension types

Extensions  ::=  SEQUENCE SIZE (1..MAX) OF Extension

Extension  ::=  SEQUENCE  {
    extnID      OBJECT IDENTIFIER,
    critical    BOOLEAN DEFAULT FALSE,
    extnValue   OCTET STRING
}

END
`;

/** A simplified PKCS#10 Certificate Signing Request (CSR) module. From RFC 2986. */
export const RFC2986_CSR_MODULE = `\
PKCS10 { iso(1) component-body(2) us(840) rsadsi(113549) pkcs(1)
    pkcs-10(10) modules(1) pkcs-10(1) }

DEFINITIONS IMPLICIT TAGS ::=

BEGIN

IMPORTS
    AlgorithmIdentifier, Name, Attributes, SubjectPublicKeyInfo
    FROM PKIX1Explicit88;

CertificationRequest ::= SEQUENCE {
    certificationRequestInfo  CertificationRequestInfo,
    signatureAlgorithm        AlgorithmIdentifier,
    signature                 BIT STRING
}

CertificationRequestInfo ::= SEQUENCE {
    version       INTEGER { v1(0) },
    subject       Name,
    subjectPKInfo SubjectPublicKeyInfo,
    attributes    [0] IMPLICIT Attributes OPTIONAL
}

Attributes ::= SET OF Attribute

Attribute ::= SEQUENCE {
    attrType   OBJECT IDENTIFIER,
    attrValues SET OF AttributeValue
}

AttributeValue ::= ANY

END
`;

/** CMS (Cryptographic Message Syntax) core types from RFC 5652. */
export const RFC5652_CMS_MODULE = `\
CryptographicMessageSyntax2004 { iso(1) component-body(2)
    us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) modules(0)
    cms-2004(24) }

DEFINITIONS IMPLICIT TAGS ::=

BEGIN

ContentInfo ::= SEQUENCE {
    contentType ContentType,
    content     [0] EXPLICIT ANY OPTIONAL
}

ContentType ::= OBJECT IDENTIFIER

SignedData ::= SEQUENCE {
    version          CMSVersion,
    digestAlgorithms DigestAlgorithmIdentifiers,
    encapContentInfo EncapsulatedContentInfo,
    certificates     [0] IMPLICIT CertificateSet OPTIONAL,
    crls             [1] IMPLICIT RevocationInfoChoices OPTIONAL,
    signerInfos      SignerInfos
}

CMSVersion ::= INTEGER { v0(0), v1(1), v2(2), v3(3), v4(4), v5(5) }

DigestAlgorithmIdentifiers ::= SET OF AlgorithmIdentifier

AlgorithmIdentifier ::= SEQUENCE {
    algorithm   OBJECT IDENTIFIER,
    parameters  ANY OPTIONAL
}

EncapsulatedContentInfo ::= SEQUENCE {
    eContentType ContentType,
    eContent     [0] EXPLICIT OCTET STRING OPTIONAL
}

CertificateSet ::= SET OF ANY

RevocationInfoChoices ::= SET OF ANY

SignerInfos ::= SET OF SignerInfo

SignerInfo ::= SEQUENCE {
    version            CMSVersion,
    sid                SignerIdentifier,
    digestAlgorithm    AlgorithmIdentifier,
    signedAttrs        [0] IMPLICIT SignedAttributes OPTIONAL,
    signatureAlgorithm AlgorithmIdentifier,
    signature          OCTET STRING,
    unsignedAttrs      [1] IMPLICIT UnsignedAttributes OPTIONAL
}

SignerIdentifier ::= CHOICE {
    issuerAndSerialNumber IssuerAndSerialNumber,
    subjectKeyIdentifier  [0] OCTET STRING
}

IssuerAndSerialNumber ::= SEQUENCE {
    issuer       ANY,
    serialNumber INTEGER
}

SignedAttributes ::= SET SIZE (1..MAX) OF Attribute

UnsignedAttributes ::= SET SIZE (1..MAX) OF Attribute

Attribute ::= SEQUENCE {
    attrType   OBJECT IDENTIFIER,
    attrValues SET OF ANY
}

END
`;
