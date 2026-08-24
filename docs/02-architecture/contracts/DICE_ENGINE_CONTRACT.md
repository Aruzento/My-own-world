---
summary: "Runtime-only Dice Engine contract for safe formula parsing and future evaluation."
read_when:
  - "Before changing dice parser or evaluator code"
  - "Before integrating dice into initiative, character actions, combat, or logs"
owner_zone: "architecture"
---

# Dice Engine Contract

Updated: 2026-08-24

## Scope

The Dice Engine is a subsystem-independent runtime/domain owner.

It must not belong to Campaign Map, Character/Properties, Rule Tree, combat, event logs, UI, storage, or workspace state.

Consumers should call the public Dice Engine facade and should not depend on tokenizer, parser, AST, evaluator, or RNG internals.

## 0.0.1.14.2 Parser Contract

Public parser entry:

- `parseDiceFormula(formula)` in `js/dice/diceEngine.js`.

Supported V1 grammar:

- integer numbers;
- dice terms: `d20`, `1d20`, `2d6`, `10d8`;
- binary arithmetic: `+`, `-`, `*`, `/`;
- unary `+` and `-`;
- grouping with parentheses.

Parser output:

- deterministic runtime AST only;
- known node types: `number`, `dice`, `unary`, `binary`;
- no random rolls;
- no totals;
- no timestamps or ids;
- no caller/workspace context.

Malformed formulas throw `DiceFormulaSyntaxError` with:

- `code: "DICE_FORMULA_SYNTAX_ERROR"`;
- `reason`;
- `position`;
- optional `tokenType`.

## Security Boundary

Formula text is data only.

The parser must not use:

- `eval`;
- `window.eval`;
- `globalThis.eval`;
- `Function`;
- `new Function`;
- string-based `setTimeout` / `setInterval`;
- dynamic import from formula text;
- DOM interpretation;
- JSON-to-code tricks.

Unsupported syntax must be rejected rather than interpreted:

- identifiers;
- property access;
- calls;
- arrays;
- strings;
- ternaries;
- exponentiation;
- bitwise operators;
- assignment;
- comments;
- exploding/reroll/keep/drop dice syntax;
- macros, variables, scripts, and arbitrary custom functions.

## Non-Goals In Parser Leaf

`0.0.1.14.2` does not:

- roll dice;
- evaluate arithmetic;
- inject or own RNG;
- apply advantage/disadvantage;
- apply critical rules;
- migrate initiative;
- create UI;
- persist RollResult;
- create event/roll/combat log records.

## Next Owner

`0.0.1.14.3` Core Dice Evaluator owns turning this AST into deterministic runtime results with injected RNG and limits.
