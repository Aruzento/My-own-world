---
summary: "Runtime-only Dice Engine contract for safe formula parsing and evaluation."
read_when:
  - "Before changing dice parser or evaluator code"
  - "Before integrating dice into initiative, character actions, combat, or logs"
owner_zone: "architecture"
---

# Dice Engine Contract

Updated: 2026-08-25

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
- `mode`: optional, currently `normal`, `advantage` or `disadvantage`;
- `criticalPolicy`: optional, currently only `none`.

Randomness contract:

- injected RNG is first-class;
- the evaluator calls only `randomInt(minInclusive, maxInclusive)`;
- each die calls `randomInt(1, sides)`;
- default production RNG uses `Math.random` and does not claim cryptographic fairness.

Runtime result:

- canonical `dice-roll-result` payload documented in `0.0.1.14.6`;
- original and normalized formula request data;
- effective `mode`;
- effective `criticalPolicy`;
- numeric `total`;
- grouped dice term details and arithmetic breakdown.

Evaluator semantics:

- evaluates only parser AST node types: `number`, `dice`, `unary`, `binary`;
- normal mode rolls each formula die exactly once;
- dice terms are independent;
- no hidden rerolls in `normal` mode;
- advantage/disadvantage behavior is mode-owned and documented in `0.0.1.14.7`;
- no critical rules;
- division by zero is rejected;
- non-finite or unsafe numeric totals are rejected.

Malformed evaluation state throws `DiceFormulaEvaluationError` with:

- `code: "DICE_FORMULA_EVALUATION_ERROR"`;
- `reason`;
- optional `nodeType`;
- optional `operator`.

Unsupported advantage/disadvantage formula shape throws `DiceFormulaEvaluationError` with:

- `code: "DICE_FORMULA_EVALUATION_ERROR"`;
- `classification: "UNSUPPORTED_MODE_FORMULA"`;
- `mode`;
- `diceTermCount`;
- no RNG calls performed before rejection.

The evaluator remains pure domain/runtime code. It must not touch DOM, UI status, storage, backups, workspace state, event logs, Campaign Map, Character/Properties, Rule Tree or combat.

## 0.0.1.14.4 Limits Contract

Central public limits live in `DICE_ENGINE_LIMITS`.

V1 configured limits:

- `MAX_FORMULA_LENGTH`: 256 characters;
- `MAX_AST_NODES`: 128;
- `MAX_PARENTHESES_DEPTH`: 16;
- `MAX_DICE_TERMS`: 32;
- `MAX_TOTAL_DICE`: 1000;
- `MAX_DICE_PER_TERM`: 1000;
- `MAX_DIE_SIDES`: 1000000;
- `MAX_SAFE_NUMBER`: JavaScript `Number.MAX_SAFE_INTEGER`.

Limits are rejection rules, not clamps.

Where possible, limits fail before rolling any dice. Examples:

- `1001d6` fails before RNG;
- `d1000001` fails before RNG;
- `1000d6+d6` fails before RNG;
- more than 32 dice terms fail before RNG.

Limit failures throw `DiceFormulaLimitError` with:

- `code: "DICE_FORMULA_LIMIT_EXCEEDED"`;
- `classification: "LIMIT_EXCEEDED"`;
- `reason`;
- `limitKind`;
- `maximum`;
- `observed`;
- optional `position`.

Malformed code-shaped strings remain invalid formula data. They must be rejected by syntax/limit handling, not interpreted:

- `constructor.constructor(...)`;
- `globalThis`;
- `window`;
- `document`;
- `process`;
- `require(...)`;
- `import(...)`;
- `()=>...`;
- template strings such as `` `${...}` ``.

## 0.0.1.14.5 RNG Contract

Dice Engine owns exactly one narrow randomness interface:

- `randomInt(minInclusive, maxInclusive)`.

Production behavior:

- `rollDice(request)` uses the engine-owned `defaultDiceRandomInt`;
- `defaultDiceRandomInt` is created by `createDefaultDiceRandomInt()`;
- the default provider uses `Math.random`;
- no cryptographic fairness is promised.

Test behavior:

- tests inject deterministic `randomInt` providers;
- the test-only helper `tests/fixtures/diceSequenceRandomInt.mjs` provides sequence-backed `randomInt` calls for exact assertions.

Provider validation:

- every die roll validates that provider output is an integer inside the exact requested range;
- invalid values such as `0`, above-range values, fractions, `NaN` and `undefined` fail;
- invalid provider output is never normalized into a legal die face;
- provider exceptions are wrapped as `DiceFormulaEvaluationError` with `reason: "randomInt provider failed"` and the original error as `cause`.

Determinism contract:

- the same formula, request options and RNG sequence produce structurally equivalent `dice-roll-result` data;
- different sequences produce the expected different faces;
- the result does not embed timestamps, generated ids, persisted seeds or workspace state.

Forbidden RNG behavior in Phase 14:

- no global seeded RNG that changes random behavior across MyOwnWorld;
- no monkey-patching `Math.random`;
- no workspace RNG state;
- no persisted seeds.

## 0.0.1.14.6 Structured RollResult Contract

`rollDice(request, { randomInt })` now returns the canonical runtime payload for future MyOwnWorld roll consumers.

Top-level shape:

- `kind: "dice-roll-result"`;
- `version: 1`;
- `request`;
- `total`;
- `dice`;
- `breakdown`;
- `critical`.

Request data:

- `formulaOriginal`: the exact formula string supplied by the caller;
- `formulaNormalized`: the whitespace-normalized V1 formula string;
- `mode`: effective roll mode, currently `normal`, `advantage` or `disadvantage`;
- `criticalPolicy`: effective critical policy, currently `none`.

Dice term data:

- `dice` contains one entry per dice term, not one flattened entry per die;
- each entry has `kind: "dice-term-result"`;
- each entry has deterministic `diceTermIndex`, `notation`, `count`, `sides`, `faces` and `total`;
- `faces` keeps the individual die results in roll order;
- advantage/disadvantage extends the primary d20 term with selection details, documented in `0.0.1.14.7`.

Breakdown data:

- `breakdown` is a runtime arithmetic explanation, not the parser AST;
- supported breakdown node kinds are `number`, `dice-term`, `unary-operation` and `binary-operation`;
- dice breakdown nodes reference the matching dice term data and include faces/total information;
- arithmetic breakdown nodes include operator, operands and total so future UI/logging can explain a roll without reparsing formula text.

Critical data:

- `critical.policy` records the effective critical policy;
- `critical.classification` is currently `none`;
- no critical behavior is implemented until its dedicated leaf.

Immutability and separation:

- returned roll results are deeply frozen;
- RollResult must not contain actor, target, character, token, workspace, campaign, HP, combat round, page object or DOM node data;
- RollResult must not contain generated ids, timestamps, persisted seeds or event identity;
- RollResult must not expose raw parser implementation details such as parser tokens, AST objects or source `start`/`end` offsets.

Error behavior:

- syntax, limit and evaluation failures throw the documented Dice Engine errors;
- failed rolls must not masquerade as successful `total: 0` results.

Phase 14.6 does not:

- implement UI;
- migrate Campaign Map initiative;
- persist roll results;
- create event/roll/combat log records;
- implement advantage/disadvantage;
- implement critical rules.

## 0.0.1.14.7 Advantage And Disadvantage Contract

Advantage and disadvantage are explicit `rollDice()` request modes. They are not formula grammar features.

Supported modes:

- `normal`;
- `advantage`;
- `disadvantage`.

Formula scope:

- `normal` mode supports every valid V1 formula;
- `advantage` and `disadvantage` require exactly one dice term;
- that dice term must be one `d20` or `1d20`;
- deterministic arithmetic around that d20 is allowed;
- additional dice terms are rejected;
- non-d20 dice terms are rejected;
- `2d20` is rejected because it is one dice term but not one primary d20.

Examples supported for advantage/disadvantage:

- `d20`;
- `1d20`;
- `d20 + 5`;
- `d20 - 2`;
- `(d20 + 3)`;
- deterministic arithmetic such as `(d20 + 5) / 2`.

Examples rejected for advantage/disadvantage:

- `2d20`;
- `d20 + d4`;
- `2d6 + 3`;
- `d12 + 4`;
- arithmetic-only formulas such as `20 + 4`.

Semantics:

- advantage rolls the primary d20 twice and keeps the higher natural face;
- disadvantage rolls the primary d20 twice and keeps the lower natural face;
- ties keep the first candidate deterministically;
- both candidate faces remain visible;
- deterministic arithmetic/modifiers are applied once to the selected natural face.

Result selection shape:

- the primary d20 dice term keeps `faces` as the candidate faces rolled;
- `total` on that dice term is the selected natural face;
- `selection.mode` is `advantage` or `disadvantage`;
- `selection.candidateFaces` records the two d20 candidates in RNG order;
- `selection.keptCandidateIndexes` and `selection.discardedCandidateIndexes` identify which candidate was kept/discarded;
- `selection.keptFaces` and `selection.discardedFaces` expose readable face values;
- `selection.selectedNatural` records the chosen natural d20 face;
- `selection.reason` is `higher-face`, `lower-face` or `tie-first-candidate`.

Phase 14.7 does not:

- rewrite formulas into `2d20kh1` or similar syntax;
- add keep/drop grammar;
- add rerolls;
- add critical behavior;
- create UI;
- migrate initiative;
- persist roll results;
- create event/roll/combat log records.

## Next Owner

`0.0.1.14.8` Critical Semantics owns explicit critical classification. The Dice Engine still does not own UI, persistence, event logs or combat behavior.
