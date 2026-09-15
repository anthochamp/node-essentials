import { DefinedValue } from "@ac-kit/core";

import { IQueueStorage } from "../queue/iqueue-storage.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPushFrontStorage } from "../storage/ipush-front-storage.js";

export type IDequeStorage<T extends DefinedValue> = IQueueStorage<T> &
	IPopBackStorage<T> &
	IPushFrontStorage<T>;
