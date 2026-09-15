import {
	Mat4x4,
	Quaternion,
	quaternionFromRotationMatrix,
	quaternionToRotationMatrix,
} from "@ac-kit/math-linear";
import { diffOfProducts, sumOfProducts } from "@ac-kit/math-scalar";

import { EulerAngles, EulerOrder } from "./euler-angles.js";

export function eulerAnglesToQuaternion(eulerAngles: EulerAngles): Quaternion {
	const c1 = Math.cos(eulerAngles.x / 2);
	const c2 = Math.cos(eulerAngles.y / 2);
	const c3 = Math.cos(eulerAngles.z / 2);
	const s1 = Math.sin(eulerAngles.x / 2);
	const s2 = Math.sin(eulerAngles.y / 2);
	const s3 = Math.sin(eulerAngles.z / 2);

	switch (eulerAngles.order) {
		case "XYZ":
			return [
				sumOfProducts(s1 * c2, c3, c1 * s2, s3),
				diffOfProducts(c1 * s2, c3, s1 * c2, s3),
				sumOfProducts(c1 * c2, s3, s1 * s2, c3),
				diffOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
		case "YXZ":
			return [
				sumOfProducts(s1 * c2, c3, c1 * s2, s3),
				diffOfProducts(c1 * s2, c3, s1 * c2, s3),
				diffOfProducts(c1 * c2, s3, s1 * s2, c3),
				sumOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
		case "ZXY":
			return [
				diffOfProducts(s1 * c2, c3, c1 * s2, s3),
				sumOfProducts(c1 * s2, c3, s1 * c2, s3),
				sumOfProducts(c1 * c2, s3, s1 * s2, c3),
				diffOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
		case "ZYX":
			return [
				diffOfProducts(s1 * c2, c3, c1 * s2, s3),
				sumOfProducts(c1 * s2, c3, s1 * c2, s3),
				diffOfProducts(c1 * c2, s3, s1 * s2, c3),
				sumOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
		case "YZX":
			return [
				sumOfProducts(s1 * c2, c3, c1 * s2, s3),
				sumOfProducts(c1 * s2, c3, s1 * c2, s3),
				diffOfProducts(c1 * c2, s3, s1 * s2, c3),
				diffOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
		case "XZY":
			return [
				diffOfProducts(s1 * c2, c3, c1 * s2, s3),
				diffOfProducts(c1 * s2, c3, s1 * c2, s3),
				sumOfProducts(c1 * c2, s3, s1 * s2, c3),
				sumOfProducts(c1 * c2, c3, s1 * s2, s3),
			];
	}
}

export function quaternionToEulerAngles(
	q: Quaternion,
	order: EulerOrder = "XYZ",
): EulerAngles {
	const x = q[0],
		y = q[1],
		z = q[2],
		w = q[3];

	let eulerX, eulerY, eulerZ;

	switch (order) {
		case "XYZ":
			eulerX = Math.atan2(
				2 * sumOfProducts(w, x, y, z),
				1 - 2 * (x * x + y * y),
			);
			eulerY = Math.asin(2 * diffOfProducts(w, y, z, x));
			eulerZ = Math.atan2(
				2 * sumOfProducts(w, z, x, y),
				1 - 2 * (y * y + z * z),
			);
			break;
		case "YXZ":
			eulerX = Math.asin(2 * diffOfProducts(w, x, y, z));
			eulerY = Math.atan2(
				2 * sumOfProducts(w, y, z, x),
				1 - 2 * (x * x + y * y),
			);
			eulerZ = Math.atan2(
				2 * sumOfProducts(w, z, x, y),
				1 - 2 * (y * y + z * z),
			);
			break;
		case "ZXY":
			eulerX = Math.asin(2 * sumOfProducts(w, x, y, z));
			eulerY = Math.atan2(
				2 * diffOfProducts(w, y, z, x),
				1 - 2 * (x * x + y * y),
			);
			eulerZ = Math.atan2(
				2 * diffOfProducts(w, z, x, y),
				1 - 2 * (y * y + z * z),
			);
			break;
		case "ZYX":
			eulerX = Math.atan2(
				2 * diffOfProducts(w, x, y, z),
				1 - 2 * (x * x + z * z),
			);
			eulerY = Math.asin(2 * sumOfProducts(w, y, x, z));
			eulerZ = Math.atan2(
				2 * diffOfProducts(w, z, x, y),
				1 - 2 * (y * y + z * z),
			);
			break;
		case "YZX":
			eulerX = Math.atan2(
				2 * sumOfProducts(w, x, z, y),
				1 - 2 * (x * x + z * z),
			);
			eulerY = Math.atan2(
				2 * diffOfProducts(w, y, x, z),
				1 - 2 * (y * y + z * z),
			);
			eulerZ = Math.asin(2 * sumOfProducts(w, z, x, y));
			break;
		case "XZY":
			eulerX = Math.atan2(
				2 * diffOfProducts(w, x, z, y),
				1 - 2 * (x * x + y * y),
			);
			eulerY = Math.atan2(
				2 * sumOfProducts(w, y, x, z),
				1 - 2 * (y * y + z * z),
			);
			eulerZ = Math.asin(2 * diffOfProducts(w, z, x, y));
			break;
	}

	return { x: eulerX, y: eulerY, z: eulerZ, order };
}

export function eulerAnglesToMat4x4(eulerAngles: EulerAngles): Mat4x4 {
	const q = eulerAnglesToQuaternion(eulerAngles);
	return quaternionToRotationMatrix(q);
}

export function mat4x4ToEulerAngles(
	m: Mat4x4,
	order: EulerOrder = "XYZ",
): EulerAngles {
	const q = quaternionFromRotationMatrix(m);
	return quaternionToEulerAngles(q, order);
}
