import { durationCondition } from "@ac-bench/measure-duration";
import { startCase } from "@ac-kit/core";
import { startCase as lodashStartCase } from "lodash-es";

import { caseCase } from "./__fixtures__/fixtures.js";

durationCondition("startCase — 2 000 identifier-ish strings", () => {
	caseCase("@ac-kit/.startCase", "js", startCase);
	caseCase("lodash startCase (npm)", "js", lodashStartCase);
});
