import { MASK_64N } from "@ac-kit/core";

import type { IRollingHash } from "./rolling-hash.js";

// 256-entry pseudorandom substitution table, analogous to Buzhash's (see
// buzhash.ts's module doc comment) — FastCDC's own paper-published Gear
// table exists but could not be reliably transcribed here in full from
// available sources without risking transcription errors, so this package
// uses its own fixed, reproducible choice instead: 256 64-bit values from a
// splitmix64 PRNG seeded with 0xc6a4a7935bd1e995, generated once and frozen
// here.
// oxfmt-ignore
const TABLE = new BigUint64Array([
	0x41aab1e69572b9c6n,	0x4b21d0b6c3d203e3n,	0x496af7a988f8e19fn,	0x3bc595f2ac7c9618n,	0xf5f14fd3c71180b2n,	0x91809174afbed851n,	0x641785a3aabc2aban,	0xe808070c00719182n,
	0x767942ca90b38c5dn,	0x1308f7513697eeedn,	0x124608af22de972dn,	0x64322a803144a614n,	0x353c6420233b7f7cn,	0x2daed2d72f00e0f2n,	0xf0b13d2ac974c6d5n,	0x893e093b94951ca7n,
	0x529351b124a96f94n,	0x2707307ed61634d5n,	0xf5076c97641149b6n,	0x632b2ae94e3cd292n,	0xf9a32aa082c63d2cn,	0x181d24c29d648813n,	0x2126c1178e9a6490n,	0xa1c322bfaa4a7973n,
	0xaa5e411e392b96e8n,	0xde9d641d6710d11fn,	0x8065438a65cac31bn,	0x89941c77bd6e0a5cn,	0xccf655cfdbb019f5n,	0xdc43747535b42e93n,	0x48367605f89c26b7n,	0x04e0eb83cba92f7dn,
	0xfd64987729a78d46n,	0x68bed964837a7476n,	0x35c12f5404bfb6c8n,	0x5d0602df9b52ad8an,	0x1f3e03ceb7ec3736n,	0xd36d8bdda1f1b572n,	0xecd50d881c1486c2n,	0x47187a2f35a6060cn,
	0x275107414b716b00n,	0x236b6d774142fa83n,	0x9f7b1771cc103768n,	0x38ad0e3abc44ecc2n,	0xe41cb379c3855644n,	0x32b6ec801b4ffb3dn,	0x1be1aee75f063e54n,	0x8f5a9b1bcd999b1fn,
	0xb62381fcb3e291d1n,	0xdbacd16e07b5c17cn,	0xe7250fd7427bf06en,	0xf4097748ea3adcb6n,	0xc3d955ea1f810266n,	0x2a82a0bb50a5e43an,	0x86454fe8c349e7dan,	0xa8e0ef28d56d9cfcn,
	0xace377f54c41f8f7n,	0xc6ca6699d0c34292n,	0xe422247d538b4ea4n,	0x88f6efefa6e826e9n,	0xe0eed278ba1a5ad2n,	0xc20f8783b5cce660n,	0xd3f3ec67fbbc068en,	0xddfac376190c8e69n,
	0xe75d46cd7b8db5c6n,	0x41149d157852af9dn,	0x954f6427c02c1363n,	0xaed74541290c6eebn,	0xbccb17f1ccf7afa5n,	0xfcef9b35ed3bee20n,	0xa96b30cceb7d404fn,	0x8436dc2bde498862n,
	0xd206228a0391aca4n,	0x9671391c893dad20n,	0xc1389d409bcbea85n,	0x0eba6152c582f65cn,	0x9ab42dd6a7bac038n,	0xc083184e0a073c27n,	0x65157f62461d90b8n,	0x9149fe686e5f95ban,
	0x3cce27a728b1a333n,	0xb98adf44942a3de8n,	0xacdff2b2aca2ab6an,	0x51c14ac71890756fn,	0xa5c5ab95ac96a31an,	0xf60e439c8e1d18a1n,	0x429618858900a105n,	0xf28360b74aded5fan,
	0xc4f01e5cad4e5d8dn,	0x6587dc1d7b59cc3en,	0x611488fad6b337efn,	0x19ae0963800be5e8n,	0x17ff00134748193dn,	0x3be9019abe2822c1n,	0xe30d268db7e24a18n,	0xdcea21959cea37f8n,
	0xbc8cca41d1a3fe00n,	0x77d23ddc66a10b73n,	0xa05f141bd0082b62n,	0x2750bee93946444an,	0x291ae67502600680n,	0xad3ca69be93d181fn,	0xc17659b524777c0cn,	0xb5cc0bff589bdad1n,
	0x047525ffb76ea429n,	0xcc362fd37c06b428n,	0x9d374892d86f96ffn,	0x95d5ec2a7487eb82n,	0x3dd79f295b442603n,	0x9d307b16859355b0n,	0xe6c934ff63071ac0n,	0x1e0c467a6cafd9b3n,
	0xacf5bcd5b8f92805n,	0xb57b2fd2317923f3n,	0xca5bdf8cd99db648n,	0x2fa705ffc5c8313an,	0x47bf4a839b964877n,	0xc7c23088dd425e90n,	0x24ee2142e18b8b31n,	0xdfa4687d123fb2e9n,
	0x12022e28f3be4ac7n,	0x55ad74045b9b5df9n,	0x858d112aa5c662dan,	0xa523cf5e6eaae3fdn,	0x974a22b009717cebn,	0xb8e04c35af268ceen,	0x778ad18e0a08e9f4n,	0x80d736977c779f97n,
	0xadb409f91214d48cn,	0x1bb4b1a43b6a8eb0n,	0xbf82a3f332e976dan,	0x3b94a8dc12ef6068n,	0x5f115ecd4d8a386en,	0xaaab5661e53c5aden,	0xab00796f7ead1b66n,	0x2ea8499dcedfc09dn,
	0xffd35c11461fa5b4n,	0x17c0787b68ed44d3n,	0x74a6b8c74327caban,	0xcaf8c23ee4f31da1n,	0xede7ffe34c5f9691n,	0x37419846f0deeffan,	0x7a270afb961c675an,	0xb52212c9568523ean,
	0x88db44668604c953n,	0x9d51879faa6aa315n,	0x29f23cf1af5593a4n,	0x9ebdb56386324316n,	0x9a136cbb8837d4c6n,	0xca1cfb3937827d5fn,	0xf40767b90bafe116n,	0x809b56779bf182ben,
	0x2897c7083f7f91bdn,	0xdca0047df3a7aac3n,	0x860bb3ee826533b0n,	0x99bca13de5a4fb80n,	0x6ed57027f7ccfd76n,	0x01bb5479fe630c94n,	0x8b2d8ad0577326e2n,	0x6de17311297a0683n,
	0xbc7bfd04f5f68df0n,	0x2c612cc0b939c00dn,	0x07c1b449f9dd4acdn,	0xe7dfdcf3c68a9773n,	0xea63cb4be53f95c7n,	0x29c593944a725aadn,	0x2c4c4305f3d09614n,	0x94e71c6ddda7a62an,
	0x051622cd7a88666bn,	0x906564f60793a551n,	0xb32c5d8146a17bb0n,	0xbb7b51b1ae0c79ean,	0x62bfb7bb52531114n,	0x288670b2d0a08416n,	0xb34b70486baf8d7bn,	0xc8e7eeec272c04e0n,
	0xbd877bf241509907n,	0xfb5b9b11addb0775n,	0xb54c6b29fb2296b4n,	0x8695e0191362bc56n,	0x33deaaa5d7b95a08n,	0x9d98696e86006a3an,	0x986b592b4e38888bn,	0x7b23c882a7d862b7n,
	0xf5e6cf900a5eee3an,	0x834e012e92fc33aen,	0xdc5301a704e9dd9fn,	0x529bf2a11e10d194n,	0x0e7b725f20eb07bdn,	0x0bde72219159ffacn,	0x53ea240d491d712fn,	0x1e1cee73a6252b20n,
	0x3b20dcde48a8df2cn,	0x387d1dbe31fb2c41n,	0x44446fe9f0505b5fn,	0x1648d73799f22ea1n,	0xf583d9c1e176a89en,	0xaaa925b8a82ed3fcn,	0xd619cb71e3a72b6fn,	0xe58dc33b178bb4cen,
	0xc9bf8778b189dd1dn,	0x60d87030a4c08fc8n,	0x7079e68390da93ban,	0x762d1c7aabc14db8n,	0x47f855979d26194dn,	0xc119970b6a47169fn,	0x13b671c30c9830d1n,	0xb9ba3a727ab399f3n,
	0x62a1a42cb3115f8cn,	0x84b081c41e6468b2n,	0x05e1a574ef49cdd6n,	0x9a6b3dfdc0517629n,	0x66ca4c9704993d10n,	0x2088fb4e2f5db800n,	0x15bd76f2988fd521n,	0x49084f4ab42ca8dan,
	0xee008a7f72930265n,	0xb7aa5b8df3042548n,	0x4c25cd068dad0b94n,	0x62c04267019421d6n,	0xcab06f54cf38003dn,	0x00b365f04f0180edn,	0x26ae7b6bf5274b46n,	0xeb14a52d8670b2e9n,
	0x80674979dae56582n,	0xab07cc92e12d2417n,	0xb9dc562d802ff889n,	0x60051a6ba334c923n,	0xf5a44d38a766a3d6n,	0x816af0e12503f81cn,	0x85d46470b9da8ecan,	0xe3267500576375c9n,
	0x61aed70b308405fan,	0xb60288d05edb064bn,	0x90a0c1f8de5b4893n,	0xcaec748744debb4bn,	0x545bf242fca8d51an,	0xce256cc00779cdcdn,	0xfc63fb97ce509fb5n,	0x1dc3eef282f509e8n,
	0xb5db25be6698881fn,	0x74ce1cae0b9fc360n,	0xd90a0482a57c0999n,	0x6f9159ff9f8b1edan,	0xb08026fc1746ac9fn,	0xbf37f9fae10ac752n,	0x2636b76f7a856030n,	0xa5af53982f6a6461n,
	0x4e0bd8d9fae2c724n,	0xb803a25e0131c97en,	0x451dec2ee4148647n,	0xef6b11975d89a9b8n,	0x6b6a368a176337dfn,	0x526fc42c145c5f51n,	0x6921de6b3681c899n,	0x58dd6ea0ca5b2894n,
]);

/**
 * Gear hash: `hash = (hash << 1) + table[byteIn]` over a 64-bit accumulator — a
 * byte's contribution shifts out of the tracked width after roughly 64 pushes
 * instead of being explicitly removed, so unlike
 * {@link "./buzhash.js".Buzhash},
 * {@link "./rabin-fingerprint.js".RabinFingerprint} and
 * {@link "./rabin-karp-hash.js".RabinKarpHash}, there is no fixed window and no
 * `windowSize` property. Purpose-built for FastCDC-style chunk-boundary
 * detection (masking the top bits of `value`), not "the hash of exactly these
 * last N bytes."
 */
export class GearHash implements IRollingHash<bigint> {
	private value_ = 0n;

	get value(): bigint {
		return this.value_;
	}

	push(byteIn: number): bigint {
		this.value_ = ((this.value_ << 1n) + TABLE[byteIn & 0xff]!) & MASK_64N;

		return this.value_;
	}
}
