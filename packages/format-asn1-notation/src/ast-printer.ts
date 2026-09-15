import { AnyAstAssignment } from "./ast/assignment.js";
import {
	AstAlternative,
	AstComponent,
	AstExtensionAdditionGroup,
	AstExtensionMarker,
} from "./ast/component.js";
import {
	AnyAstConstraint,
	AstSizeConstraint,
	AstStringBound,
	AstValueRangeConstraint,
} from "./ast/constraint.js";
import { AstModule } from "./ast/module.js";
import {
	AnyAstType,
	AstBitStringType,
	AstChoiceType,
	AstConstrainedType,
	AstEnumeratedType,
	AstIntegerType,
	AstSequenceOfType,
	AstSequenceType,
	AstSetOfType,
	AstSetType,
	AstTaggedType,
	AstTypeReference,
} from "./ast/type.js";
import { AnyAstValue } from "./ast/value.js";

export interface PrintOptions {
	readonly indentWidth?: number;
	readonly lineEnding?: "\n" | "\r\n";
}

class Printer {
	private readonly indentStr: string;
	private readonly nl: string;
	private level = 0;
	private out = "";

	constructor(opts: PrintOptions = {}) {
		this.indentStr = " ".repeat(opts.indentWidth ?? 4);
		this.nl = opts.lineEnding ?? "\n";
	}

	indent(): void {
		this.level++;
	}
	dedent(): void {
		this.level--;
	}

	emit(s: string): void {
		this.out += s;
	}

	line(s = ""): void {
		if (s) this.out += this.indentStr.repeat(this.level) + s + this.nl;
		else this.out += this.nl;
	}

	result(): string {
		return this.out;
	}
}

export function printModule(module: AstModule, options?: PrintOptions): string {
	const p = new Printer(options);

	// Module header
	const oidStr = module.oid ? ` { ${module.oid.join(" ")} }` : "";
	p.line(`${module.name}${oidStr}`);
	p.line();

	let defLine = "DEFINITIONS";
	if (module.tagDefault !== "none") {
		defLine += ` ${module.tagDefault.toUpperCase()} TAGS`;
	}
	if (module.extensibilityImplied) defLine += " EXTENSIBILITY IMPLIED";
	defLine += " ::=";
	p.line(defLine);
	p.line();
	p.line("BEGIN");
	p.line();

	// Exports
	if (Array.isArray(module.exports)) {
		p.line(`EXPORTS ${(module.exports as string[]).join(", ")};`);
		p.line();
	}

	// Imports
	if (module.imports.length > 0) {
		p.line("IMPORTS");
		p.indent();
		for (const imp of module.imports) {
			const oidStr = imp.oid ? ` { ${imp.oid.join(" ")} }` : "";
			p.line(`${imp.symbols.join(", ")}`);
			p.line(`    FROM ${imp.fromModule}${oidStr}`);
		}
		p.dedent();
		p.line(";");
		p.line();
	}

	// Assignments
	for (const assignment of module.assignments) {
		printAssignment(p, assignment);
		p.line();
	}

	p.line("END");
	return p.result();
}

function printAssignment(p: Printer, a: AnyAstAssignment): void {
	if (a.kind === "typeAssignment") {
		const paramsStr =
			a.params && a.params.length > 0
				? ` { ${a.params.map((pm) => (pm.governor ? `${printType(pm.governor)} : ${pm.name}` : pm.name)).join(", ")} }`
				: "";
		p.emit(`${a.name}${paramsStr} ::= `);
		printTypeInline(p, a.type);
		p.emit(p.result().endsWith("\n") ? "" : "\n");
	} else {
		p.line(`${a.name} ${printType(a.type)} ::= ${printValueInline(a.value)}`);
	}
}

function printTypeInline(p: Printer, t: AnyAstType): void {
	p.emit(printType(t));
}

function printType(t: AnyAstType): string {
	switch (t.kind) {
		case "boolean":
			return "BOOLEAN";
		case "integer":
			return printIntegerType(t as AstIntegerType);
		case "bitString":
			return printBitStringType(t as AstBitStringType);
		case "octetString":
			return "OCTET STRING";
		case "null":
			return "NULL";
		case "objectIdentifier":
			return "OBJECT IDENTIFIER";
		case "relativeOid":
			return "RELATIVE-OID";
		case "oidIri":
			return "OID-IRI";
		case "relativeOidIri":
			return "RELATIVE-OID-IRI";
		case "real":
			return "REAL";
		case "enumerated":
			return printEnumeratedType(t as AstEnumeratedType);
		case "any":
			return "ANY";
		case "external":
			return "EXTERNAL";
		case "embeddedPdv":
			return "EMBEDDED PDV";
		case "characterString":
			return "CHARACTER STRING";

		case "utf8String":
			return "UTF8String";
		case "numericString":
			return "NumericString";
		case "printableString":
			return "PrintableString";
		case "teletexString":
			return "TeletexString";
		case "videotexString":
			return "VideotexString";
		case "ia5String":
			return "IA5String";
		case "graphicString":
			return "GraphicString";
		case "visibleString":
			return "VisibleString";
		case "generalString":
			return "GeneralString";
		case "universalString":
			return "UniversalString";
		case "bmpString":
			return "BMPString";
		case "objectDescriptor":
			return "ObjectDescriptor";

		case "utcTime":
			return "UTCTime";
		case "generalizedTime":
			return "GeneralizedTime";
		case "time":
			return "TIME";
		case "date":
			return "DATE";
		case "timeOfDay":
			return "TIME-OF-DAY";
		case "dateTime":
			return "DATE-TIME";
		case "duration":
			return "DURATION";

		case "sequence":
			return printSequenceType(t as AstSequenceType);
		case "set":
			return printSetType(t as AstSetType);
		case "sequenceOf":
			return printSequenceOfType(t as AstSequenceOfType);
		case "setOf":
			return printSetOfType(t as AstSetOfType);
		case "choice":
			return printChoiceType(t as AstChoiceType);
		case "tagged":
			return printTaggedType(t as AstTaggedType);
		case "constrained":
			return printConstrainedType(t as AstConstrainedType);
		case "typeReference": {
			const ref = t as AstTypeReference;
			return ref.name;
		}
	}
}

function printIntegerType(t: AstIntegerType): string {
	if (!t.namedNumbers.length) return "INTEGER";
	const nums = t.namedNumbers.map((n) => `${n.name}(${n.value})`).join(", ");
	return `INTEGER { ${nums} }`;
}

function printBitStringType(t: AstBitStringType): string {
	if (!t.namedBits.length) return "BIT STRING";
	const bits = t.namedBits.map((b) => `${b.name}(${b.index})`).join(", ");
	return `BIT STRING { ${bits} }`;
}

function printEnumeratedType(t: AstEnumeratedType): string {
	const vals = t.values.map((v) => `${v.name}(${v.value})`).join(", ");
	return `ENUMERATED { ${vals}${t.extensible ? ", ..." : ""} }`;
}

function printSequenceType(t: AstSequenceType): string {
	if (!t.components.length) return "SEQUENCE {}";
	const comps = t.components.map(printSeqComponent).join(",\n    ");
	return `SEQUENCE {\n    ${comps}\n}`;
}

function printSetType(t: AstSetType): string {
	if (!t.components.length) return "SET {}";
	const comps = t.components.map(printSeqComponent).join(",\n    ");
	return `SET {\n    ${comps}\n}`;
}

function printSeqComponent(
	c: AstComponent | AstExtensionMarker | AstExtensionAdditionGroup,
): string {
	if (c.kind === "extensionMarker") return "...";
	if (c.kind === "extensionAdditionGroup") {
		const ver = c.version != null ? ` ${c.version}` : "";
		const comps = c.components.map(printComponent).join(",\n        ");
		return `[[${ver}\n        ${comps}\n    ]]`;
	}
	return printComponent(c);
}

function printComponent(c: AstComponent): string {
	let s = `${c.name}  ${printType(c.type)}`;
	if (c.optional) s += " OPTIONAL";
	return s;
}

function printSequenceOfType(t: AstSequenceOfType): string {
	const constraint = t.constraint ? ` ${printConstraint(t.constraint)}` : "";
	return `SEQUENCE${constraint} OF ${printType(t.elementType)}`;
}

function printSetOfType(t: AstSetOfType): string {
	const constraint = t.constraint ? ` ${printConstraint(t.constraint)}` : "";
	return `SET${constraint} OF ${printType(t.elementType)}`;
}

function printChoiceType(t: AstChoiceType): string {
	const alts = t.alternatives
		.map((a) => {
			if (a.kind === "extensionMarker") return "...";
			if (a.kind === "extensionAdditionGroup") return "[[...]]";
			return `${(a as AstAlternative).name}  ${printType((a as AstAlternative).type)}`;
		})
		.join(",\n    ");
	return `CHOICE {\n    ${alts}\n}`;
}

function printTaggedType(t: AstTaggedType): string {
	const cls = t.tagClass !== "context" ? ` ${t.tagClass.toUpperCase()}` : "";
	const mode = t.mode ? ` ${t.mode.toUpperCase()}` : "";
	return `[${cls}${t.tagNumber}]${mode} ${printType(t.innerType)}`;
}

function printConstrainedType(t: AstConstrainedType): string {
	return `${printType(t.baseType)} ${printConstraint(t.constraint)}`;
}

/** A character-string bound is written back with the quotes it was read with. */
function printRangeBound(
	bound: bigint | AstStringBound | "MIN" | "MAX",
): string {
	if (bound === "MIN" || bound === "MAX") {
		return bound;
	}
	if (typeof bound === "bigint") {
		return bound.toString();
	}
	return `"${bound.text}"`;
}

function printConstraint(c: AnyAstConstraint): string {
	switch (c.kind) {
		case "valueRange": {
			const vc = c as AstValueRangeConstraint;
			const min = printRangeBound(vc.min);
			const max = printRangeBound(vc.max);
			return min === max ? `(${min})` : `(${min}..${max})`;
		}
		case "size": {
			const sc = c as AstSizeConstraint;
			return `(SIZE ${printConstraint(sc.constraint)})`;
		}
		case "permittedAlphabet":
			return `(FROM ${printConstraint((c as any).constraint)})`;
		case "union":
			return `(${(c as any).operands.map(printConstraint).join(" | ")})`;
		case "intersection":
			return `(${(c as any).operands.map(printConstraint).join(" ^ ")})`;
		case "extensible": {
			const ext = c as any;
			return `(${printConstraint(ext.base)}, ...)`;
		}
		case "contentsConstraint":
			return `(CONTAINING ${printType((c as any).containingType)})`;
		case "withComponents":
			return "(WITH COMPONENTS { ... })";
	}
}

function printValueInline(v: AnyAstValue): string {
	switch (v.kind) {
		case "integer":
			return String(v.value);
		case "boolean":
			return v.value ? "TRUE" : "FALSE";
		case "string":
			return `"${v.value}"`;
		case "null":
			return "NULL";
		case "oid":
			return `{ ${v.components.join(" ")} }`;
		case "bitString":
			return v.hex;
		case "sequence":
			return `{ ${v.fields.map((f) => `${f.name} ${printValueInline(f.value)}`).join(", ")} }`;
		case "choice":
			return `${v.alternative} : ${printValueInline(v.value)}`;
	}
}
