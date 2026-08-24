---
summary: "Runtime-only Dice Engine contract for safe formula parsing and evaluation."
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

## 0.0.1.14.3 Evaluator Contract

Public roll entry:

- `rollDice(request, { randomInt })` in `js/dice/diceEngine.js`.

Request shape:

- `formula`: string parsed by `parseDiceFormula`;
- `mode`: optional, currently only `normal`;
- `criticalPolicy`: optional, currently only `none`.

Randomness contract:

- injected RNG is first-class;
- the evaluator calls only `randomInt(minInclusive, maxInclusive)`;
- each die calls `randomInt(1, sides)`;
- default production RNG uses `Math.random` and does not claim cryptographic fairness.

Runtime result:

- `type: "rollResult"`;
- original `formula`;
- effective `mode`;
- effective `criticalPolicy`;
- numeric `total`;
- ordered `rolls` with die range and value details.

Evaluator semantics:

- evaluates only parser AST node types: `number`, `dice`, `unary`, `binary`;
- rolls each die exactly once;
- dice terms are independent;
- no hidden rerolls;
- no advantage/disadvantage;
- no critical rules;
- division by zero is rejected;
- non-finite or unsafe numeric totals are rejected.

Malformed evaluation state throws `DiceFormulaEvaluationError` with:

- `code: "DICE_FORMULA_EVALUATION_ERROR"`;
- `reason`;
- optional `nodeType`;
- optional `operator`.

The evaluator remains pure domain/runtime code. It must not touch DOM, UI status, storage, backups, workspace state, event logs, Campaign Map, Character/Properties, Rule Tree or combat.

## Next Owner

`0.0.1.14.4` Dice Safety Limits owns explicit formula/dice/evaluation caps. The current evaluator has finite-number protection, but broad anti-abuse limits are intentionally not finalized in `0.0.1.14.3`.
