// A top-level `import` here would make this a module, turning the block below
// into an augmentation of a package that has no declarations to augment.
declare module "ndarray-gemm" {
	/** `out = a × b`, in place. Returns `out`. */
	export default function gemm(
		out: import("ndarray").NdArray,
		a: import("ndarray").NdArray,
		b: import("ndarray").NdArray,
	): import("ndarray").NdArray;
}
