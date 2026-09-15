import {
	CstAnyAssignment,
	CstParameter,
	CstParameterList,
} from "./cst/assignment.js";
import { CstConstraint, CstConstraintSpec } from "./cst/constraint.js";
import {
	CstChoiceComponent,
	CstChoiceType,
	CstComponentType,
	CstExtensionAdditionGroup,
	CstSequenceOfType,
	CstSequenceOrSetComponent,
	CstSequenceType,
	CstSetOfType,
	CstSetType,
} from "./cst/constructed.js";
import {
	CstExports,
	CstImports,
	CstModuleBody,
	CstModuleDefinition,
	CstModuleIdentifier,
	CstOidComponent,
	CstOidValue,
	CstSymbolsFromModule,
	CstTagDefault,
} from "./cst/module.js";
import {
	CstActualParam,
	CstAnyType,
	CstBuiltinPrimitiveType,
	CstNamedValue,
	CstTaggedType,
} from "./cst/type.js";
import { CstAnyValue } from "./cst/value.js";
import { Lexer } from "./lexer.js";
import { Span } from "./span.js";
import { Token, TokenKind } from "./token.js";

/** Keywords that can only begin a type, never a value. */
const BUILTIN_TYPE_START: ReadonlySet<TokenKind> = new Set([
	TokenKind.KwBitString,
	TokenKind.KwBmpString,
	TokenKind.KwBoolean,
	TokenKind.KwCharacterString,
	TokenKind.KwChoice,
	TokenKind.KwDate,
	TokenKind.KwDateTime,
	TokenKind.KwDuration,
	TokenKind.KwEmbeddedPdv,
	TokenKind.KwEnumerated,
	TokenKind.KwExternal,
	TokenKind.KwGeneralString,
	TokenKind.KwGeneralizedTime,
	TokenKind.KwGraphicString,
	TokenKind.KwIa5String,
	TokenKind.KwInteger,
	TokenKind.KwIso646String,
	TokenKind.KwNull,
	TokenKind.KwNumericString,
	TokenKind.KwObjectDescriptor,
	TokenKind.KwObjectIdentifier,
	TokenKind.KwOctetString,
	TokenKind.KwOidIri,
	TokenKind.KwPrintableString,
	TokenKind.KwReal,
	TokenKind.KwRelativeOid,
	TokenKind.KwRelativeOidIri,
	TokenKind.KwSequence,
	TokenKind.KwSet,
	TokenKind.KwT61String,
	TokenKind.KwTeletexString,
	TokenKind.KwTime,
	TokenKind.KwTimeOfDay,
	TokenKind.KwUniversalString,
	TokenKind.KwUtcTime,
	TokenKind.KwUtf8String,
	TokenKind.KwVideotexString,
	TokenKind.KwVisibleString,
]);

export class ParseError extends Error {
	readonly span: Span;
	readonly expected: string;
	constructor(message: string, span: Span, expected: string) {
		super(message);
		this.name = "ParseError";
		this.span = span;
		this.expected = expected;
	}
}

export class Parser {
	private readonly lexer: Lexer;
	private _errors: ParseError[] = [];

	constructor(source: string) {
		this.lexer = new Lexer(source);
	}

	get errors(): readonly ParseError[] {
		return this._errors;
	}

	parseModule(): CstModuleDefinition {
		const start = this.lexer.peek().span.start;
		const moduleIdentifier = this._parseModuleIdentifier();
		this._expect(TokenKind.KwDefinitions);
		const tagDefault = this._parseTagDefault();
		const extensibilityImplied =
			this._consume(TokenKind.KwExtensibilityImplied) !== undefined &&
			this._consume(TokenKind.KwImplied) !== undefined;
		this._expect(TokenKind.Assign);
		this._expect(TokenKind.KwBegin);
		const body = this._parseModuleBody();
		const endToken = this._expect(TokenKind.KwEnd);
		return {
			kind: "moduleDefinition",
			span: { start, end: endToken.span.end },
			moduleIdentifier,
			tagDefault,
			extensibilityImplied,
			body,
			endToken,
		};
	}

	private _parseModuleIdentifier(): CstModuleIdentifier {
		const name = this._expect(TokenKind.TypeReference);
		const oid =
			this.lexer.peekKind() === TokenKind.LeftBrace
				? this._parseOidValue()
				: undefined;
		return { kind: "moduleIdentifier", span: name.span, name, oid };
	}

	private _parseTagDefault(): CstTagDefault | undefined {
		if (this.lexer.peekKind() === TokenKind.KwExplicit) {
			const start = this.lexer.next().span.start;
			this._expect(TokenKind.KwTags);
			return {
				kind: "tagDefault",
				span: { start, end: this.lexer.peek().span.start },
				mode: "explicit",
			};
		}
		if (this.lexer.peekKind() === TokenKind.KwImplicit) {
			const start = this.lexer.next().span.start;
			this._expect(TokenKind.KwTags);
			return {
				kind: "tagDefault",
				span: { start, end: this.lexer.peek().span.start },
				mode: "implicit",
			};
		}
		if (this.lexer.peekKind() === TokenKind.KwAutomatic) {
			const start = this.lexer.next().span.start;
			this._expect(TokenKind.KwTags);
			return {
				kind: "tagDefault",
				span: { start, end: this.lexer.peek().span.start },
				mode: "automatic",
			};
		}
		return undefined;
	}

	private _parseModuleBody(): CstModuleBody {
		const start = this.lexer.peek().span.start;
		let exports: CstExports | undefined;
		let imports: CstImports | undefined;
		const assignments: CstAnyAssignment[] = [];

		if (this.lexer.peekKind() === TokenKind.KwExports)
			exports = this._parseExports();
		if (this.lexer.peekKind() === TokenKind.KwImports)
			imports = this._parseImports();

		while (
			this.lexer.peekKind() !== TokenKind.KwEnd &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			try {
				assignments.push(this._parseAssignment());
			} catch (e) {
				if (e instanceof ParseError) {
					this._errors.push(e);
					this._recover();
				} else throw e;
			}
		}

		return {
			kind: "moduleBody",
			span: { start, end: this.lexer.peek().span.start },
			exports,
			imports,
			assignments,
		};
	}

	private _parseExports(): CstExports {
		const start = this._expect(TokenKind.KwExports).span.start;
		if (this.lexer.peekKind() === TokenKind.KwAll) {
			this.lexer.next();
			this._expect(TokenKind.Semicolon);
			return {
				kind: "exports",
				span: { start, end: this.lexer.peek().span.start },
				symbols: undefined,
			};
		}
		const symbols: Token[] = [];
		for (;;) {
			symbols.push(
				this._expectAnyOf([TokenKind.TypeReference, TokenKind.Identifier]),
			);
			if (this.lexer.peekKind() !== TokenKind.Comma) break;
			this.lexer.next();
		}
		this._expect(TokenKind.Semicolon);
		return {
			kind: "exports",
			span: { start, end: this.lexer.peek().span.start },
			symbols,
		};
	}

	private _parseImports(): CstImports {
		const start = this._expect(TokenKind.KwImports).span.start;
		const symbolsFromModules: CstSymbolsFromModule[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.Semicolon &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			symbolsFromModules.push(this._parseSymbolsFromModule());
		}
		this._expect(TokenKind.Semicolon);
		return {
			kind: "imports",
			span: { start, end: this.lexer.peek().span.start },
			symbolsFromModules,
		};
	}

	private _parseSymbolsFromModule(): CstSymbolsFromModule {
		const start = this.lexer.peek().span.start;
		const symbols: Token[] = [];
		for (;;) {
			symbols.push(
				this._expectAnyOf([TokenKind.TypeReference, TokenKind.Identifier]),
			);
			if (this.lexer.peekKind() !== TokenKind.Comma) break;
			this.lexer.next();
		}
		this._expect(TokenKind.KwFrom);
		const module = this._expect(TokenKind.TypeReference);
		const oid =
			this.lexer.peekKind() === TokenKind.LeftBrace
				? this._parseOidValue()
				: undefined;
		return {
			kind: "symbolsFromModule",
			span: { start, end: this.lexer.peek().span.start },
			symbols,
			module,
			oid,
		};
	}

	private _parseOidValue(): CstOidValue {
		const start = this._expect(TokenKind.LeftBrace).span.start;
		const components: CstOidComponent[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			//const cspan = this.lexer.peek().span;
			this.lexer.peek();
			if (this.lexer.peekKind() === TokenKind.Number) {
				const tok = this.lexer.next();
				components.push({ kind: "oidNumber", span: tok.span, token: tok });
			} else if (
				this.lexer.peekKind() === TokenKind.Identifier ||
				this.lexer.peekKind() === TokenKind.TypeReference
			) {
				const nameTok = this.lexer.next();
				// Could be name(number) or just name
				if (this.lexer.peekKind() === TokenKind.LeftParen) {
					this.lexer.next(); // (
					const numTok = this._expect(TokenKind.Number);
					this._expect(TokenKind.RightParen);
					components.push({
						kind: "oidNameAndNumber",
						span: {
							start: nameTok.span.start,
							end: this.lexer.peek().span.start,
						},
						name: nameTok,
						number: numTok,
					});
				} else {
					components.push({
						kind: "oidName",
						span: nameTok.span,
						token: nameTok,
					});
				}
			} else {
				break;
			}
		}
		const end = this._expect(TokenKind.RightBrace).span.end;
		return { kind: "oidValue", span: { start, end }, components };
	}

	private _parseAssignment(): CstAnyAssignment {
		const name = this._expectAnyOf([
			TokenKind.TypeReference,
			TokenKind.Identifier,
		]);
		const isType = name.kind === TokenKind.TypeReference;

		// Check for parameterized type: Name { ... } ::= ...
		let params: CstParameterList | undefined;
		if (isType && this.lexer.peekKind() === TokenKind.LeftBrace) {
			params = this._parseParameterList();
		}

		this._expect(TokenKind.Assign);

		if (isType) {
			const type = this._parseType();
			return {
				kind: "typeAssignment",
				span: { start: name.span.start, end: type.span.end },
				name,
				params,
				type,
			};
		} else {
			// Value assignment: name Type ::= value
			const type = this._parseType();
			const value = this._parseValue();
			return {
				kind: "valueAssignment",
				span: { start: name.span.start, end: value.span.end },
				name,
				type,
				value,
			};
		}
	}

	private _parseParameterList(): CstParameterList {
		const start = this._expect(TokenKind.LeftBrace).span.start;
		const params: CstParameter[] = [];
		for (;;) {
			params.push(this._parseParameter());
			if (this.lexer.peekKind() !== TokenKind.Comma) break;
			this.lexer.next();
		}
		const end = this._expect(TokenKind.RightBrace).span.end;
		return { kind: "parameterList", span: { start, end }, params };
	}

	private _parseParameter(): CstParameter {
		const start = this.lexer.peek().span.start;
		// Governor : name  OR  just name (type param)
		const nameOrGovernor = this._expectAnyOf([
			TokenKind.TypeReference,
			TokenKind.Identifier,
		]);
		if (this.lexer.peekKind() === TokenKind.Colon) {
			this.lexer.next();
			const name = this._expectAnyOf([
				TokenKind.TypeReference,
				TokenKind.Identifier,
			]);
			const governor: CstAnyType = {
				kind: "referencedType",
				span: nameOrGovernor.span,
				name: nameOrGovernor,
				actualParams: undefined,
			};
			return {
				kind: "parameter",
				span: { start, end: name.span.end },
				governor,
				name,
			};
		}
		return {
			kind: "parameter",
			span: { start, end: nameOrGovernor.span.end },
			governor: undefined,
			name: nameOrGovernor,
		};
	}

	parseType(): CstAnyType {
		return this._parseType();
	}

	private _parseType(): CstAnyType {
		const base = this._parseBaseType();
		// Check for inline constraint: e.g. OCTET STRING (SIZE(1..10))
		if (this.lexer.peekKind() === TokenKind.LeftParen) {
			const constraint = this._parseConstraint();
			return {
				kind: "constrainedType",
				span: { start: base.span.start, end: constraint.span.end },
				baseType: base,
				constraint,
			};
		}
		return base;
	}

	/** Whether the next token opens a builtin type rather than a value. */
	private _peekIsBuiltinTypeStart(): boolean {
		return BUILTIN_TYPE_START.has(this.lexer.peekKind());
	}

	private _parseBaseType(): CstAnyType {
		const k = this.lexer.peekKind();
		const start = this.lexer.peek().span.start;

		// Tagged type: [CLASS number] [IMPLICIT|EXPLICIT] Type
		if (k === TokenKind.LeftBracket) return this._parseTaggedType();

		// Sequence, Set, Choice, SequenceOf, SetOf
		if (k === TokenKind.KwSequence) return this._parseSequenceOrSequenceOf();
		if (k === TokenKind.KwSet) return this._parseSetOrSetOf();
		if (k === TokenKind.KwChoice) return this._parseChoiceType();
		if (k === TokenKind.KwBoolean) {
			this.lexer.next();
			return {
				kind: "boolean",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwNull) {
			this.lexer.next();
			return {
				kind: "null",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwReal) {
			this.lexer.next();
			return {
				kind: "real",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwEnumerated) return this._parseEnumeratedType();
		if (k === TokenKind.KwInteger) return this._parseIntegerType();
		if (k === TokenKind.KwBitString) return this._parseBitStringType();
		if (k === TokenKind.KwOctetString) return this._parseOctetStringType();
		if (k === TokenKind.KwObject) return this._parseObjectIdentifier();
		if (k === TokenKind.KwRelativeOid) {
			this.lexer.next();
			return {
				kind: "relativeOid",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwOidIri) {
			this.lexer.next();
			return {
				kind: "oidIri",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwRelativeOidIri) {
			this.lexer.next();
			return {
				kind: "relativeOidIri",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}

		// String types
		const stringKind = this._tryStringKind(k);
		if (stringKind) {
			this.lexer.next();
			return {
				kind: stringKind,
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}

		// Time types
		const timeKind = this._tryTimeKind(k);
		if (timeKind) {
			this.lexer.next();
			return {
				kind: timeKind,
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}

		// ANY (before the duplicate check below)
		if (k === TokenKind.KwExternal) {
			this.lexer.next();
			return {
				kind: "external",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwEmbeddedPdv) {
			this.lexer.next();
			return {
				kind: "embeddedPdv",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}
		if (k === TokenKind.KwCharacterString) {
			this.lexer.next();
			this._consume(TokenKind.KwString);
			return {
				kind: "characterString",
				span: this._spanSince(start),
				tokens: [],
			} as CstBuiltinPrimitiveType;
		}

		// TypeReference (unresolved)
		if (k === TokenKind.TypeReference) {
			const name = this.lexer.next();
			const actualParams =
				this.lexer.peekKind() === TokenKind.LeftBrace
					? this._parseActualParameterList()
					: undefined;
			return {
				kind: "referencedType",
				span: name.span,
				name,
				actualParams,
			};
		}

		// ANY (keyword ANY is not in our token table as a specific kind — it's a TypeReference "ANY" or identifier)
		if (k === TokenKind.Identifier) {
			const tok = this.lexer.next();
			if (tok.text === "ANY")
				return {
					kind: "any",
					span: tok.span,
					tokens: [tok],
				} as CstBuiltinPrimitiveType;
			// unknown identifier type — return as referenced type
			return {
				kind: "referencedType",
				span: tok.span,
				name: tok,
				actualParams: undefined,
			};
		}

		throw new ParseError(
			`Unexpected token "${this.lexer.peek().text}" when expecting a type`,
			this.lexer.peek().span,
			"type",
		);
	}

	private _spanSince(start: number): Span {
		return { start, end: this.lexer.peek().span.start };
	}

	private _parseObjectIdentifier(): CstBuiltinPrimitiveType {
		const start = this.lexer.next().span.start; // OBJECT
		// Consume "IDENTIFIER" — appears as TypeReference since it's not in the keyword table
		const ident = this.lexer.peek();
		if (
			(ident.kind === TokenKind.TypeReference ||
				ident.kind === TokenKind.Identifier) &&
			ident.text === "IDENTIFIER"
		) {
			this.lexer.next();
		}
		return {
			kind: "objectIdentifier",
			span: this._spanSince(start),
			tokens: [],
		};
	}

	private _parseIntegerType(): CstBuiltinPrimitiveType {
		const start = this.lexer.next().span.start; // INTEGER
		if (this.lexer.peekKind() === TokenKind.LeftBrace) {
			const namedValues = this._parseNamedNumberList();
			return {
				kind: "integer",
				span: this._spanSince(start),
				tokens: [],
				namedValues,
			};
		}
		return { kind: "integer", span: this._spanSince(start), tokens: [] };
	}

	private _parseEnumeratedType(): CstBuiltinPrimitiveType {
		const start = this.lexer.next().span.start; // ENUMERATED
		const namedValues = this._parseNamedNumberList();
		return {
			kind: "enumerated",
			span: this._spanSince(start),
			tokens: [],
			namedValues,
		};
	}

	private _parseBitStringType(): CstBuiltinPrimitiveType {
		const start = this.lexer.next().span.start; // BIT
		// Expect STRING
		const strTok = this.lexer.peek();
		if (
			strTok.kind === TokenKind.KwString ||
			(strTok.kind === TokenKind.TypeReference && strTok.text === "STRING")
		) {
			this.lexer.next();
		}
		if (this.lexer.peekKind() === TokenKind.LeftBrace) {
			const namedValues = this._parseNamedNumberList();
			return {
				kind: "bitString",
				span: this._spanSince(start),
				tokens: [],
				namedValues,
			};
		}
		return { kind: "bitString", span: this._spanSince(start), tokens: [] };
	}

	private _parseOctetStringType(): CstBuiltinPrimitiveType {
		const start = this.lexer.next().span.start; // OCTET
		// Expect STRING
		const strTok = this.lexer.peek();
		if (
			strTok.kind === TokenKind.KwString ||
			(strTok.kind === TokenKind.TypeReference && strTok.text === "STRING")
		) {
			this.lexer.next();
		}
		return { kind: "octetString", span: this._spanSince(start), tokens: [] };
	}

	private _parseNamedNumberList(): CstNamedValue[] {
		const result: CstNamedValue[] = [];
		this._expect(TokenKind.LeftBrace);
		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			if (this.lexer.peekKind() === TokenKind.Ellipsis) {
				this.lexer.next(); // extension marker in ENUMERATED
				if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
				continue;
			}
			const name = this._expectAnyOf([
				TokenKind.Identifier,
				TokenKind.TypeReference,
			]);
			this._expect(TokenKind.LeftParen);
			const num = this._expectAnyOf([TokenKind.Number, TokenKind.Minus]);
			// Handle negative numbers
			let numToken = num;
			if (num.kind === TokenKind.Minus) {
				const digits = this._expect(TokenKind.Number);
				numToken = {
					...digits,
					text: "-" + digits.text,
					span: { start: num.span.start, end: digits.span.end },
				};
			}
			this._expect(TokenKind.RightParen);
			result.push({
				kind: "namedValue",
				span: { start: name.span.start, end: this.lexer.peek().span.start },
				name,
				number: numToken,
			});
			if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
		}
		this._expect(TokenKind.RightBrace);
		return result;
	}

	private _parseTaggedType(): CstTaggedType {
		const start = this._expect(TokenKind.LeftBracket).span.start;
		// Optional tag class
		let tagClass: "context" | "application" | "private" | "universal" =
			"context";
		if (this.lexer.peekKind() === TokenKind.KwApplication) {
			this.lexer.next();
			tagClass = "application";
		} else if (this.lexer.peekKind() === TokenKind.KwPrivate) {
			this.lexer.next();
			tagClass = "private";
		} else if (this.lexer.peekKind() === TokenKind.KwUniversal) {
			this.lexer.next();
			tagClass = "universal";
		}
		const tagNumber = this._expect(TokenKind.Number);
		this._expect(TokenKind.RightBracket);

		let mode: "implicit" | "explicit" | "automatic" | undefined;
		if (this.lexer.peekKind() === TokenKind.KwImplicit) {
			this.lexer.next();
			mode = "implicit";
		} else if (this.lexer.peekKind() === TokenKind.KwExplicit) {
			this.lexer.next();
			mode = "explicit";
		} else if (this.lexer.peekKind() === TokenKind.KwAutomatic) {
			this.lexer.next();
			mode = "automatic";
		}

		const innerType = this._parseType();
		return {
			kind: "taggedType",
			span: { start, end: innerType.span.end },
			tagClass,
			tagNumber,
			mode,
			innerType,
		};
	}

	private _parseSequenceOrSequenceOf(): CstSequenceType | CstSequenceOfType {
		const start = this._expect(TokenKind.KwSequence).span.start;
		if (this.lexer.peekKind() === TokenKind.KwOf) {
			this.lexer.next();
			const elementType = this._parseType();
			return {
				kind: "sequenceOf",
				span: { start, end: elementType.span.end },
				constraint: undefined,
				elementType,
			};
		}
		if (this.lexer.peekKind() === TokenKind.KwSize) {
			// SEQUENCE SIZE (n..m) OF
			const sizeStart = this.lexer.next().span.start; // SIZE
			const inner = this._parseConstraint();
			const constraint: CstConstraint = {
				kind: "constraint",
				span: { start: sizeStart, end: inner.span.end },
				spec: {
					kind: "size",
					span: { start: sizeStart, end: inner.span.end },
					constraint: inner,
				},
			};
			this._expect(TokenKind.KwOf);
			const elementType = this._parseType();
			return {
				kind: "sequenceOf",
				span: { start, end: elementType.span.end },
				constraint,
				elementType,
			};
		}
		if (this.lexer.peekKind() === TokenKind.LeftParen) {
			const constraint = this._parseConstraint();
			this._expect(TokenKind.KwOf);
			const elementType = this._parseType();
			return {
				kind: "sequenceOf",
				span: { start, end: elementType.span.end },
				constraint,
				elementType,
			};
		}
		const components = this._parseComponentList();
		return {
			kind: "sequence",
			span: { start, end: this.lexer.peek().span.start },
			components,
		};
	}

	private _parseSetOrSetOf(): CstSetType | CstSetOfType {
		const start = this._expect(TokenKind.KwSet).span.start;
		if (this.lexer.peekKind() === TokenKind.KwOf) {
			this.lexer.next();
			const elementType = this._parseType();
			return {
				kind: "setOf",
				span: { start, end: elementType.span.end },
				constraint: undefined,
				elementType,
			};
		}
		if (this.lexer.peekKind() === TokenKind.KwSize) {
			// SET SIZE (n..m) OF
			const sizeStart = this.lexer.next().span.start; // SIZE
			const inner = this._parseConstraint();
			const constraint: CstConstraint = {
				kind: "constraint",
				span: { start: sizeStart, end: inner.span.end },
				spec: {
					kind: "size",
					span: { start: sizeStart, end: inner.span.end },
					constraint: inner,
				},
			};
			this._expect(TokenKind.KwOf);
			const elementType = this._parseType();
			return {
				kind: "setOf",
				span: { start, end: elementType.span.end },
				constraint,
				elementType,
			};
		}
		if (this.lexer.peekKind() === TokenKind.LeftParen) {
			const constraint = this._parseConstraint();
			this._expect(TokenKind.KwOf);
			const elementType = this._parseType();
			return {
				kind: "setOf",
				span: { start, end: elementType.span.end },
				constraint,
				elementType,
			};
		}
		const components = this._parseComponentList();
		return {
			kind: "set",
			span: { start, end: this.lexer.peek().span.start },
			components,
		};
	}

	private _parseComponentList(): CstSequenceOrSetComponent[] {
		this._expect(TokenKind.LeftBrace);
		const components: CstSequenceOrSetComponent[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			if (this.lexer.peekKind() === TokenKind.Ellipsis) {
				const tok = this.lexer.next();
				components.push({ kind: "extensionMarker", span: tok.span });
				if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
				continue;
			}
			if (this.lexer.peekKind() === TokenKind.DoubleBracketLeft) {
				components.push(this._parseExtensionAdditionGroup());
				if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
				continue;
			}
			if (this.lexer.peekKind() === TokenKind.KwComponents) {
				const start = this.lexer.next().span.start; // COMPONENTS
				this._expect(TokenKind.KwOf);
				const type = this._parseType();
				components.push({
					kind: "componentsOf",
					span: { start, end: type.span.end },
					type,
				});
				if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
				continue;
			}
			components.push(this._parseComponentType());
			if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
		}
		this._expect(TokenKind.RightBrace);
		return components;
	}

	private _parseExtensionAdditionGroup(): CstExtensionAdditionGroup {
		const start = this._expect(TokenKind.DoubleBracketLeft).span.start;
		// Optional version
		let version: Token | undefined;
		if (this.lexer.peekKind() === TokenKind.Number) version = this.lexer.next();
		const components: CstComponentType[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.DoubleBracketRight &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			components.push(this._parseComponentType());
			if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
		}
		const end = this._expect(TokenKind.DoubleBracketRight).span.end;
		return {
			kind: "extensionAdditionGroup",
			span: { start, end },
			version,
			components,
		};
	}

	private _parseComponentType(): CstComponentType {
		const start = this.lexer.peek().span.start;
		const name = this._expectAnyOf([
			TokenKind.Identifier,
			TokenKind.TypeReference,
		]);
		const type = this._parseType();
		let optional = false;
		let defaultValue: CstAnyValue | undefined;
		if (this.lexer.peekKind() === TokenKind.KwOptional) {
			this.lexer.next();
			optional = true;
		} else if (this.lexer.peekKind() === TokenKind.KwDefault) {
			this.lexer.next();
			optional = true;
			if (
				this.lexer.peekKind() !== TokenKind.Comma &&
				this.lexer.peekKind() !== TokenKind.RightBrace
			) {
				defaultValue = this._parseValue();
			}
		}
		return {
			kind: "component",
			span: { start, end: type.span.end },
			name,
			type,
			optional,
			defaultValue,
		};
	}

	private _parseChoiceType(): CstChoiceType {
		const start = this._expect(TokenKind.KwChoice).span.start;
		this._expect(TokenKind.LeftBrace);
		const alternatives: CstChoiceComponent[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			if (this.lexer.peekKind() === TokenKind.Ellipsis) {
				const tok = this.lexer.next();
				alternatives.push({ kind: "extensionMarker", span: tok.span });
				if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
				continue;
			}
			const name = this._expectAnyOf([
				TokenKind.Identifier,
				TokenKind.TypeReference,
			]);
			const type = this._parseType();
			alternatives.push({
				kind: "alternative",
				span: { start: name.span.start, end: type.span.end },
				name,
				type,
			});
			if (this.lexer.peekKind() === TokenKind.Comma) this.lexer.next();
		}
		const end = this._expect(TokenKind.RightBrace).span.end;
		return { kind: "choice", span: { start, end }, alternatives };
	}

	private _parseConstraint(): CstConstraint {
		const start = this._expect(TokenKind.LeftParen).span.start;
		const spec = this._parseConstraintSpec();
		const end = this._expect(TokenKind.RightParen).span.end;
		return { kind: "constraint", span: { start, end }, spec };
	}

	private _parseConstraintSpec(): CstConstraintSpec {
		const k = this.lexer.peekKind();
		const start = this.lexer.peek().span.start;

		if (k === TokenKind.KwSize) {
			this.lexer.next();
			const inner = this._parseConstraint();
			return {
				kind: "size",
				span: { start, end: inner.span.end },
				constraint: inner,
			};
		}
		if (k === TokenKind.KwFrom) {
			this.lexer.next();
			const inner = this._parseConstraint();
			return {
				kind: "permittedAlphabet",
				span: { start, end: inner.span.end },
				constraint: inner,
			};
		}

		// Value range: lower .. upper  OR  single value
		return this._parseValueRange();
	}

	private _parseValueRange(): CstConstraintSpec {
		const start = this.lexer.peek().span.start;
		let lower: Token | "MIN";

		if (this.lexer.peekKind() === TokenKind.KwMin) {
			this.lexer.next();
			lower = "MIN";
		} else {
			lower = this._parseValueToken();
		}

		if (this.lexer.peekKind() === TokenKind.DotDot) {
			this.lexer.next();
			const upperInclusive = true;
			let upper: Token | "MAX";
			if (this.lexer.peekKind() === TokenKind.KwMax) {
				this.lexer.next();
				upper = "MAX";
			} else {
				upper = this._parseValueToken();
			}
			return {
				kind: "valueRange",
				span: { start, end: this.lexer.peek().span.start },
				lower,
				upperInclusive,
				upper,
			};
		}
		// Single value constraint — treat as lower..lower
		const tok =
			lower === "MIN"
				? ({
						kind: TokenKind.KwMin,
						text: "MIN",
						span: { start, end: start },
						leadingTrivia: [],
					} as Token)
				: lower;
		return {
			kind: "valueRange",
			span: { start, end: this.lexer.peek().span.start },
			lower: tok,
			upperInclusive: true,
			upper: tok,
		};
	}

	private _parseValueToken(): Token {
		// Handle negative numbers
		if (this.lexer.peekKind() === TokenKind.Minus) {
			const minus = this.lexer.next();
			const num = this._expect(TokenKind.Number);
			return {
				...num,
				text: "-" + num.text,
				span: { start: minus.span.start, end: num.span.end },
			};
		}
		return this._expectAnyOf([
			TokenKind.Number,
			TokenKind.CharString,
			TokenKind.Identifier,
			TokenKind.TypeReference,
		]);
	}

	private _parseValue(): CstAnyValue {
		const k = this.lexer.peekKind();
		if (k === TokenKind.LeftBrace) {
			// OID value or sequence value
			return this._parseOidOrSequenceValue();
		}
		const tok = this.lexer.next();
		return { kind: "literal", span: tok.span, token: tok };
	}

	/**
	 * Actual parameters of a parameterized type instance, `Ref { A, 3, B }`
	 * (X.683 §9).
	 *
	 * A parameter is a type or a value, and the two are not distinguishable
	 * without the governing formal parameter list, which is not resolved until
	 * compilation. An upper-case start means a type reference or a builtin type,
	 * so it is parsed as a type; anything else is parsed as a value token.
	 */
	private _parseActualParameterList(): readonly CstActualParam[] {
		this._expect(TokenKind.LeftBrace);

		const params: CstActualParam[] = [];
		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			const start = this.lexer.peek().span.start;
			let value: CstActualParam["value"];
			if (
				this.lexer.peekKind() === TokenKind.TypeReference ||
				this._peekIsBuiltinTypeStart()
			) {
				value = this._parseType();
			} else {
				const token = this.lexer.next();
				value = { kind: "tokenLiteral", span: token.span, token };
			}

			params.push({
				span: { start, end: this.lexer.peek().span.start },
				value,
			});

			if (this.lexer.peekKind() === TokenKind.Comma) {
				this.lexer.next();
				continue;
			}
			break;
		}

		this._expect(TokenKind.RightBrace);
		return params;
	}

	private _parseOidOrSequenceValue(): CstAnyValue {
		const start = this._expect(TokenKind.LeftBrace).span.start;
		const components: CstOidComponent[] = [];
		//const fields: CstNamedValuePair[] = [];

		while (
			this.lexer.peekKind() !== TokenKind.RightBrace &&
			this.lexer.peekKind() !== TokenKind.EndOfFile
		) {
			if (this.lexer.peekKind() === TokenKind.Number) {
				const tok = this.lexer.next();
				components.push({ kind: "oidNumber", span: tok.span, token: tok });
			} else if (
				this.lexer.peekKind() === TokenKind.Identifier ||
				this.lexer.peekKind() === TokenKind.TypeReference
			) {
				const nameTok = this.lexer.next();
				if (this.lexer.peekKind() === TokenKind.LeftParen) {
					this.lexer.next();
					const numTok = this._expect(TokenKind.Number);
					this._expect(TokenKind.RightParen);
					components.push({
						kind: "oidNameAndNumber",
						span: {
							start: nameTok.span.start,
							end: this.lexer.peek().span.start,
						},
						name: nameTok,
						number: numTok,
					});
				} else {
					components.push({
						kind: "oidName",
						span: nameTok.span,
						token: nameTok,
					});
				}
			} else {
				break;
			}
		}

		const end = this._expect(TokenKind.RightBrace).span.end;
		return { kind: "oidValue", span: { start, end }, components };
	}

	private _recover(): void {
		// Skip tokens until we find a likely synchronization point
		while (true) {
			const k = this.lexer.peekKind();
			if (k === TokenKind.EndOfFile || k === TokenKind.KwEnd) return;
			if (k === TokenKind.TypeReference) {
				// Could be start of next assignment — check if next-next is ::=
				// We don't have two-token lookahead, so just return and hope
				return;
			}
			this.lexer.next();
		}
	}

	private _expect(kind: TokenKind): Token {
		const tok = this.lexer.peek();
		if (tok.kind !== kind) {
			throw new ParseError(
				`Expected ${TokenKind[kind]} but got "${tok.text}" (${TokenKind[tok.kind]})`,
				tok.span,
				TokenKind[kind] ?? String(kind),
			);
		}
		return this.lexer.next();
	}

	private _expectAnyOf(kinds: TokenKind[]): Token {
		const tok = this.lexer.peek();
		if (!kinds.includes(tok.kind)) {
			throw new ParseError(
				`Expected one of [${kinds.map((k) => TokenKind[k]).join(", ")}] but got "${tok.text}"`,
				tok.span,
				kinds.map((k) => TokenKind[k] ?? String(k)).join("|"),
			);
		}
		return this.lexer.next();
	}

	private _consume(kind: TokenKind): Token | undefined {
		if (this.lexer.peekKind() === kind) return this.lexer.next();
		return undefined;
	}

	private _tryStringKind(k: TokenKind): string | undefined {
		switch (k) {
			case TokenKind.KwUtf8String:
				return "utf8String";
			case TokenKind.KwNumericString:
				return "numericString";
			case TokenKind.KwPrintableString:
				return "printableString";
			case TokenKind.KwTeletexString:
			case TokenKind.KwT61String:
				return "teletexString";
			case TokenKind.KwVideotexString:
				return "videotexString";
			case TokenKind.KwIa5String:
			case TokenKind.KwIso646String:
				return "ia5String";
			case TokenKind.KwGraphicString:
				return "graphicString";
			case TokenKind.KwVisibleString:
				return "visibleString";
			case TokenKind.KwGeneralString:
				return "generalString";
			case TokenKind.KwUniversalString:
				return "universalString";
			case TokenKind.KwBmpString:
				return "bmpString";
			case TokenKind.KwObjectDescriptor:
				return "objectDescriptor";
			default:
				return undefined;
		}
	}

	private _tryTimeKind(k: TokenKind): string | undefined {
		switch (k) {
			case TokenKind.KwUtcTime:
				return "utcTime";
			case TokenKind.KwGeneralizedTime:
				return "generalizedTime";
			case TokenKind.KwTime:
				return "time";
			case TokenKind.KwDate:
				return "date";
			case TokenKind.KwTimeOfDay:
				return "timeOfDay";
			case TokenKind.KwDateTime:
				return "dateTime";
			case TokenKind.KwDuration:
				return "duration";
			default:
				return undefined;
		}
	}
}
