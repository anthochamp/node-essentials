import { DefinedValue } from "@ac-kit/core";

import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";

export type IQueueStorage<T extends DefinedValue> = IPushBackStorage<T> &
	IPopFrontStorage<T>;
