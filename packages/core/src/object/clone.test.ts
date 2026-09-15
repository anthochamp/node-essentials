import { expect, suite, test } from "vitest";

import { UnsupportedError } from "../error/unsupported-error.js";
import { clone } from "./clone.js";

suite("clone", () => {
	test("should clone plain objects", () => {
		const obj = { a: 1, b: { c: 2 } };
		const cloned = clone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.b).toBe(obj.b); // Shallow clone, nested objects are the same reference
	});

	test("should clone arrays", () => {
		const arr = [1, 2, { a: 3 }];
		const cloned = clone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
		expect(cloned[2]).toBe(arr[2]); // Shallow clone, nested objects are the same reference
	});

	test("should preserve array holes", () => {
		const sparse: (number | undefined)[] = [1, 2, 3];
		// oxlint-disable-next-line typescript/no-array-delete -- punching a hole is exactly what this asserts the clone preserves
		delete sparse[1];

		const cloned = clone(sparse);

		expect(cloned).toHaveLength(3);
		expect(1 in cloned).toBe(false);
	});

	test("should return primitives as is", () => {
		expect(clone(42)).toBe(42);
		expect(clone("hello")).toBe("hello");
		expect(clone(true)).toBe(true);
		expect(clone(null)).toBe(null);
		expect(clone(undefined)).toBe(undefined);
		expect(clone(10n)).toBe(10n);
	});

	test("should throw when trying to clone functions", () => {
		const func = () => {};
		expect(() => clone(func)).toThrow(UnsupportedError);
	});

	test("should throw when trying to clone symbols", () => {
		const sym = Symbol("test");
		expect(() => clone(sym)).toThrow(UnsupportedError);
	});

	test("should throw on values that hold no copyable state", () => {
		expect(() => clone(new WeakMap())).toThrow(UnsupportedError);
		expect(() => clone(new WeakSet())).toThrow(UnsupportedError);
		expect(() => clone(Promise.resolve())).toThrow(UnsupportedError);
	});

	test("should keep a function-valued property, which is never visited", () => {
		const handler = () => 1;
		const cloned = clone({ handler, count: 1 });

		expect(cloned.handler).toBe(handler);
		expect(cloned.count).toBe(1);
	});

	test("should clone Date objects", () => {
		const date = new Date();
		const cloned = clone(date);

		expect(cloned).toEqual(date);
		expect(cloned).not.toBe(date);
	});

	test("should clone RegExp objects", () => {
		const regex = /test/g;
		regex.lastIndex = 2;

		const cloned = clone(regex);

		expect(cloned).not.toBe(regex);
		expect(cloned.source).toBe("test");
		expect(cloned.flags).toBe("g");
		expect(cloned.lastIndex).toBe(2);
	});

	test("should clone Map objects", () => {
		const map = new Map();
		map.set("a", 1);
		const cloned = clone(map);

		expect(cloned).toEqual(map);
		expect(cloned).not.toBe(map);
	});

	test("should clone Set objects", () => {
		const set = new Set([1, 2, 3]);
		const cloned = clone(set);

		expect(cloned).toEqual(set);
		expect(cloned).not.toBe(set);
	});

	suite("fidelity", () => {
		test("should keep the prototype, so a class instance stays one", () => {
			class Point {
				constructor(public x: number) {}
				get doubled(): number {
					return this.x * 2;
				}
			}

			const cloned = clone(new Point(3));

			expect(cloned).toBeInstanceOf(Point);
			expect(cloned.x).toBe(3);
			expect(cloned.doubled).toBe(6);
		});

		test("should flatten to an ordinary object when asked", () => {
			class Point {
				constructor(public x: number) {}
			}

			const cloned = clone(new Point(3), { prototype: "plain" });

			expect(cloned).not.toBeInstanceOf(Point);
			expect(cloned.x).toBe(3);
		});

		test("should keep a null prototype", () => {
			const source = Object.create(null) as { a: number };
			source.a = 1;

			expect(Object.getPrototypeOf(clone(source))).toBe(null);
		});

		test("should copy symbol keys, and drop them when asked", () => {
			const key = Symbol("tag");
			const source: Record<symbol, number> = { [key]: 1 };

			expect(clone(source)[key]).toBe(1);
			expect(
				Object.getOwnPropertySymbols(clone(source, { symbolKeys: false })),
			).toHaveLength(0);
		});

		test("should copy non-enumerable properties, and drop them when asked", () => {
			const source = {};
			Object.defineProperty(source, "hidden", { value: 1, enumerable: false });

			expect(Object.getOwnPropertyNames(clone(source))).toEqual(["hidden"]);
			expect(
				Object.getOwnPropertyNames(clone(source, { nonEnumerable: false })),
			).toEqual([]);
		});

		test("should copy property attributes", () => {
			const source = {};
			Object.defineProperty(source, "locked", {
				value: 1,
				writable: false,
				enumerable: false,
				configurable: false,
			});

			expect(Object.getOwnPropertyDescriptor(clone(source), "locked")).toEqual({
				value: 1,
				writable: false,
				enumerable: false,
				configurable: false,
			});
		});

		test("should share an accessor's functions, since they cannot be copied", () => {
			let reads = 0;
			const source = {
				get counted(): number {
					reads++;
					return reads;
				},
			};

			const cloned = clone(source);

			expect(Object.getOwnPropertyDescriptor(cloned, "counted")?.get).toBe(
				Object.getOwnPropertyDescriptor(source, "counted")?.get,
			);
		});

		test("should read an accessor into a writable data property when descriptors are off", () => {
			const source = {
				get secret(): string {
					return "value";
				},
			};

			const cloned = clone(source, { descriptors: false });
			const descriptor = Object.getOwnPropertyDescriptor(cloned, "secret");

			expect(descriptor?.value).toBe("value");
			expect(descriptor?.writable).toBe(true);
		});

		test("should let a flattened accessor be overwritten", () => {
			const source = {
				get secret(): string {
					return "value";
				},
			};

			// `descriptors: false` turns the getter into a writable data property,
			// which the source's static type cannot express
			const cloned = clone(source, { descriptors: false }) as {
				secret: string;
			};
			cloned.secret = "[redacted]";

			expect(cloned.secret).toBe("[redacted]");
		});
	});

	suite("errors", () => {
		test("should copy an error rather than inherit from it", () => {
			const error = new TypeError("boom");
			const cloned = clone(error);

			expect(cloned).toBeInstanceOf(TypeError);
			expect(cloned.message).toBe("boom");
			expect(Object.getPrototypeOf(cloned)).toBe(TypeError.prototype);
		});

		test("should not fall through to the original once a property is removed", () => {
			const error = new Error("boom");
			const cloned = clone(error);

			delete (cloned as { message?: string }).message;

			expect(cloned.message).toBe("");
			expect(error.message).toBe("boom");
		});

		test("should carry the cause", () => {
			const cause = new Error("root");
			const cloned = clone(new Error("outer", { cause }), { recursive: true });

			expect((cloned.cause as Error).message).toBe("root");
			expect(cloned.cause).not.toBe(cause);
		});
	});

	suite("binary data", () => {
		test("should copy the bytes behind a typed array", () => {
			const source = new Uint8Array([1, 2, 3]);
			const cloned = clone(source);

			cloned[0] = 99;

			expect(source[0]).toBe(1);
			expect(cloned).toHaveLength(3);
		});

		test("should copy an ArrayBuffer", () => {
			const source = new ArrayBuffer(4);
			new Uint8Array(source).set([1, 2, 3, 4]);

			const cloned = clone(source);
			new Uint8Array(cloned)[0] = 99;

			expect(new Uint8Array(source)[0]).toBe(1);
		});

		test("should keep a view's offset and length", () => {
			const buffer = new ArrayBuffer(16);
			const source = new Uint16Array(buffer, 4, 3);
			source.set([7, 8, 9]);

			const cloned = clone(source);

			expect(cloned.byteOffset).toBe(4);
			expect(Array.from(cloned)).toEqual([7, 8, 9]);
		});

		test("should copy a DataView", () => {
			const source = new DataView(new ArrayBuffer(8));
			source.setUint32(0, 42);

			const cloned = clone(source);

			expect(cloned).toBeInstanceOf(DataView);
			expect(cloned.getUint32(0)).toBe(42);
			expect(cloned.buffer).not.toBe(source.buffer);
		});

		test("should keep a SharedArrayBuffer shared", () => {
			const source = new SharedArrayBuffer(8);

			expect(clone(source)).toBe(source);
		});
	});

	suite("recursive", () => {
		test("should copy nested values rather than share them", () => {
			const obj = { a: 1, b: { c: 2 } };
			const cloned = clone(obj, { recursive: true });

			expect(cloned).toEqual(obj);
			expect(cloned).not.toBe(obj);
			expect(cloned.b).not.toBe(obj.b);
		});

		test("should copy nested values inside arrays", () => {
			const arr = [1, 2, { a: 3 }];
			const cloned = clone(arr, { recursive: true });

			expect(cloned).toEqual(arr);
			expect(cloned[2]).not.toBe(arr[2]);
		});

		test("should return primitives as is", () => {
			expect(clone(42, { recursive: true })).toBe(42);
			expect(clone("hello", { recursive: true })).toBe("hello");
			expect(clone(null, { recursive: true })).toBe(null);
			expect(clone(10n, { recursive: true })).toBe(10n);
		});

		test("should copy Map, Set and Date structurally", () => {
			const map = new Map([["a", { b: 1 }]]);
			const clonedMap = clone(map, { recursive: true });

			expect(clonedMap).toEqual(map);
			expect(clonedMap.get("a")).not.toBe(map.get("a"));

			const date = new Date();
			expect(clone(date, { recursive: true })).toEqual(date);

			const set = new Set([1, 2, 3]);
			expect(clone(set, { recursive: true })).toEqual(set);
		});

		test("should clone Map keys too", () => {
			const key = { id: 1 };
			const cloned = clone(new Map([[key, "v"]]), { recursive: true });
			const [clonedKey] = [...cloned.keys()];

			expect(clonedKey).toEqual(key);
			expect(clonedKey).not.toBe(key);
		});

		test("should preserve a self reference", () => {
			const source: { self?: unknown } = {};
			source.self = source;

			const cloned = clone(source, { recursive: true });

			expect(cloned.self).toBe(cloned);
			expect(cloned).not.toBe(source);
		});

		test("should preserve a mutual reference", () => {
			const left: { peer?: unknown } = {};
			const right: { peer?: unknown } = { peer: left };
			left.peer = right;

			const cloned = clone(left, { recursive: true });

			expect((cloned.peer as typeof right).peer).toBe(cloned);
		});

		test("should clone a repeated reference once and keep it shared", () => {
			const shared = { n: 1 };
			const cloned = clone({ a: shared, b: shared }, { recursive: true });

			expect(cloned.a).toBe(cloned.b);
			expect(cloned.a).not.toBe(shared);
		});

		test("should reject what cannot be copied", () => {
			expect(() => clone(() => {}, { recursive: true })).toThrow(
				UnsupportedError,
			);
			expect(() => clone(Symbol("test"), { recursive: true })).toThrow(
				UnsupportedError,
			);
			expect(() => clone({ fn: () => {} }, { recursive: true })).toThrow(
				UnsupportedError,
			);
		});

		test("should match structuredClone on the types both support", () => {
			const source = {
				number: 1,
				text: "a",
				list: [1, { nested: true }],
				map: new Map<string, unknown>([["k", { v: 1 }]]),
				set: new Set([1, 2]),
				date: new Date(0),
				pattern: /x/g,
				bytes: new Uint8Array([1, 2, 3]),
			};

			const cloned = clone(source, {
				recursive: true,
				prototype: "plain",
				descriptors: false,
			});

			expect(cloned).toEqual(structuredClone(source));
		});
	});

	suite("unsupported policy", () => {
		test("should share the original when told to reference it", () => {
			const handler = () => 1;
			const cloned = clone(
				{ handler, nested: { handler } },
				{ recursive: true, unsupported: "reference" },
			);

			expect(cloned.handler).toBe(handler);
			expect(cloned.nested.handler).toBe(handler);
		});

		test("should drop the property when told to omit it", () => {
			const cloned = clone(
				{ handler: () => 1, count: 2 },
				{ recursive: true, unsupported: "omit" },
			);

			expect(Object.hasOwn(cloned, "handler")).toBe(false);
			expect(cloned.count).toBe(2);
		});

		test("should drop an omitted entry from a Set", () => {
			const cloned = clone(new Set([1, () => {}, 3]), {
				recursive: true,
				unsupported: "omit",
			});

			expect([...cloned]).toEqual([1, 3]);
		});
	});

	suite("transfer", () => {
		test("should move a buffer instead of copying it", () => {
			const source = new ArrayBuffer(4);
			new Uint8Array(source).set([1, 2, 3, 4]);

			const cloned = clone(source, { transfer: [source] });

			expect(source.detached).toBe(true);
			expect(cloned.byteLength).toBe(4);
			expect(new Uint8Array(cloned)[0]).toBe(1);
		});

		test("should detach every view over a moved buffer", () => {
			const buffer = new ArrayBuffer(4);
			const view = new Uint8Array(buffer);

			clone(buffer, { transfer: [buffer] });

			expect(view.byteLength).toBe(0);
		});

		test("should move a buffer reached through a view", () => {
			const source = new Uint8Array([1, 2, 3]);
			const buffer = source.buffer as ArrayBuffer;

			const cloned = clone(source, { transfer: [buffer] });

			expect(buffer.detached).toBe(true);
			expect(Array.from(cloned)).toEqual([1, 2, 3]);
		});

		test("should move a buffer once and keep its views in agreement", () => {
			const buffer = new ArrayBuffer(16);
			const head = new Uint8Array(buffer, 0, 8);
			const tail = new Uint8Array(buffer, 8, 8);

			const cloned = clone(
				{ head, tail },
				{ recursive: true, transfer: [buffer] },
			);

			expect(buffer.detached).toBe(true);
			expect(cloned.head.buffer).toBe(cloned.tail.buffer);
		});

		test("should honour a depth-1 buffer without recursing", () => {
			const buffer = new ArrayBuffer(4);
			new Uint8Array(buffer).set([1, 2, 3, 4]);

			const cloned = clone({ buffer }, { transfer: [buffer] });

			expect(buffer.detached).toBe(true);
			expect(cloned.buffer.byteLength).toBe(4);
		});

		test("should reject a transferable the host alone can move", () => {
			const channel = new MessageChannel();

			expect(() =>
				clone({}, { transfer: [channel.port1 as unknown as ArrayBuffer] }),
			).toThrow(UnsupportedError);

			channel.port1.close();
			channel.port2.close();
		});

		test("should reject a SharedArrayBuffer", () => {
			expect(() =>
				clone(
					{},
					{ transfer: [new SharedArrayBuffer(8) as unknown as ArrayBuffer] },
				),
			).toThrow(UnsupportedError);
		});

		test("should reject a duplicate entry", () => {
			const buffer = new ArrayBuffer(4);

			expect(() => clone(buffer, { transfer: [buffer, buffer] })).toThrow(
				UnsupportedError,
			);
		});

		test("should reject an already-detached buffer", () => {
			const buffer = new ArrayBuffer(4);
			buffer.transfer();

			expect(() => clone(buffer, { transfer: [buffer] })).toThrow(
				UnsupportedError,
			);
		});

		test("should reject a buffer the value never reaches", () => {
			const unrelated = new ArrayBuffer(4);

			expect(() => clone({ a: 1 }, { transfer: [unrelated] })).toThrow(
				UnsupportedError,
			);
			expect(unrelated.detached).toBe(false);
		});
	});

	suite("host objects", () => {
		test("should copy a DOMException through the platform", () => {
			const source = new DOMException("nope", "DataError");
			const cloned = clone(source);

			expect(cloned).toBeInstanceOf(DOMException);
			expect(cloned).not.toBe(source);
			expect(cloned.name).toBe("DataError");
			expect(cloned.message).toBe("nope");
		});

		test("should copy a Blob through the platform", async () => {
			const source = new Blob(["hello"], { type: "text/plain" });
			const cloned = clone(source);

			expect(cloned).toBeInstanceOf(Blob);
			expect(cloned).not.toBe(source);
			expect(await cloned.text()).toBe("hello");
		});
	});
});
