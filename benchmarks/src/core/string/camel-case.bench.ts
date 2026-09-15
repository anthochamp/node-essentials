import { durationCondition } from "@ac-bench/measure-duration";
import { camelCase } from "@ac-kit/core";
import { camelCase as ccCamelCase } from "change-case";
import { camelCase as lodashCamelCase } from "lodash-es";
import { camelCase as sculeCamelCase } from "scule";

import { caseCase } from "./__fixtures__/fixtures.js";

durationCondition("camelCase — 2 000 identifier-ish strings", () => {
	caseCase("@ac-kit/.camelCase", "js", camelCase);
	caseCase("lodash camelCase (npm)", "js", lodashCamelCase);
	caseCase("change-case camelCase (npm)", "js", ccCamelCase);
	caseCase("scule camelCase (npm)", "js", sculeCamelCase);
});
