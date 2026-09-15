import { durationCondition } from "@ac-bench/measure-duration";
import { capitalize, upperFirst } from "@ac-kit/core";
import {
	capitalize as lodashCapitalize,
	upperFirst as lodashUpperFirst,
} from "lodash-es";

import { caseCase } from "./__fixtures__/fixtures.js";

durationCondition("first character — capitalize and upperFirst", () => {
	caseCase("@ac-kit/.capitalize", "js", capitalize);
	caseCase("@ac-kit/.upperFirst", "js", upperFirst);
	caseCase(
		"slice and concatenate",
		"native",
		(input) => input.charAt(0).toUpperCase() + input.slice(1),
	);
	caseCase("replace with anchored regex", "native", (input) =>
		input.replace(/^./, (first) => first.toUpperCase()),
	);
	caseCase("lodash upperFirst (npm)", "js", lodashUpperFirst);
	caseCase("lodash capitalize (npm)", "js", lodashCapitalize);
});
