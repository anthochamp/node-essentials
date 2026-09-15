import { durationCondition } from "@ac-bench/measure-duration";
import { snakeCase } from "@ac-kit/core";
import { snakeCase as ccSnakeCase } from "change-case";
import { snakeCase as lodashSnakeCase } from "lodash-es";
import { snakeCase as sculeSnakeCase } from "scule";

import { caseCase } from "./__fixtures__/fixtures.js";

durationCondition("snakeCase — 2 000 identifier-ish strings", () => {
	caseCase("@ac-kit/.snakeCase", "js", snakeCase);
	caseCase("lodash snakeCase (npm)", "js", lodashSnakeCase);
	caseCase("change-case snakeCase (npm)", "js", ccSnakeCase);
	caseCase("scule snakeCase (npm)", "js", sculeSnakeCase);
});
