import { DefinedValue } from "@ac-kit/core";

import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";

export type IStackStorage<T extends DefinedValue> = IPushBackStorage<T> &
	IPopBackStorage<T>;
