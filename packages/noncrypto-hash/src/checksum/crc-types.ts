/**
 * A parametrised CRC algorithm, in the Rocksoft/CRC-RevEng catalogue's own
 * terms — {@link https://reveng.sourceforge.io/crc-catalogue/all.htm}.
 */
export type CrcParams = {
	/** Register width in bits. */
	readonly width: 8 | 16 | 32;
	/** The generating polynomial, MSB-first, with the top (implicit) bit omitted. */
	readonly polynomial: number;
	/** The register's value before the first byte is read. */
	readonly init: number;
	/** `true` if each input byte is consumed least-significant-bit first. */
	readonly refIn: boolean;
	/** `true` if the register is bit-reversed before `xorOut` is applied. */
	readonly refOut: boolean;
	/** XORed into the register after every byte has been read and any `refOut`. */
	readonly xorOut: number;
};

/** A parametrised 64-bit CRC algorithm, in the CRC-RevEng catalogue's terms. */
export type Crc64Params = {
	readonly polynomial: bigint;
	readonly init: bigint;
	readonly refIn: boolean;
	readonly refOut: boolean;
	readonly xorOut: bigint;
};

export type CrcOptions = {
	preset?: CrcParams;
};

export type Crc64Options = {
	preset?: Crc64Params;
};
