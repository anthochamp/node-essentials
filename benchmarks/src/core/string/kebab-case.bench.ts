import { durationCondition } from "@ac-bench/measure-duration";
import { kebabCase } from "@ac-kit/core";
import { kebabCase as ccKebabCase } from "change-case";
import { kebabCase as lodashKebabCase } from "lodash-es";
import { kebabCase as sculeKebabCase } from "scule";

import { caseCase } from "./__fixtures__/fixtures.js";

durationCondition("kebabCase — 2 000 identifier-ish strings", () => {
	caseCase("@ac-kit/.kebabCase", "js", kebabCase);
	caseCase("lodash kebabCase (npm)", "js", lodashKebabCase);
	caseCase("change-case kebabCase (npm)", "js", ccKebabCase);
	caseCase("scule kebabCase (npm)", "js", sculeKebabCase);
});
