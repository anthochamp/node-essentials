export type Point2<T extends bigint | number | string | null = number> = {
	x: T;
	y: T;
};

export type Point3<T extends bigint | number | string | null = number> = {
	x: T;
	y: T;
	z: T;
};

export type Size2<T extends bigint | number | string | null = number> = {
	width: T;
	height: T;
};

export type Size3<T extends bigint | number | string | null = number> = {
	width: T;
	height: T;
	depth: T;
};
