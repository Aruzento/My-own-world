const TOKEN_EOF =
  'eof';

const BINARY_OPERATORS =
  new Set([
    '+',
    '-',
    '*',
    '/'
  ]);


export const DICE_ENGINE_LIMITS =
  Object.freeze({
    MAX_FORMULA_LENGTH:
      256,
    MAX_AST_NODES:
      128,
    MAX_PARENTHESES_DEPTH:
      16,
    MAX_DICE_TERMS:
      32,
    MAX_TOTAL_DICE:
      1000,
    MAX_DICE_PER_TERM:
      1000,
    MAX_DIE_SIDES:
      1000000,
    MAX_SAFE_NUMBER:
      Number.MAX_SAFE_INTEGER
  });


export class DiceFormulaSyntaxError extends SyntaxError {

  constructor(
    reason,
    {
      position = 0,
      tokenType = null
    } = {}
  ) {

    super(
      `${reason} at position ${position}`
    );

    this.name =
      'DiceFormulaSyntaxError';

    this.code =
      'DICE_FORMULA_SYNTAX_ERROR';

    this.reason =
      reason;

    this.position =
      position;

    this.tokenType =
      tokenType;
  }
}


export class DiceFormulaLimitError extends Error {

  constructor(
    reason,
    {
      limitKind,
      maximum,
      observed,
      position = null
    }
  ) {

    super(
      reason
    );

    this.name =
      'DiceFormulaLimitError';

    this.code =
      'DICE_FORMULA_LIMIT_EXCEEDED';

    this.classification =
      'LIMIT_EXCEEDED';

    this.reason =
      reason;

    this.limitKind =
      limitKind;

    this.maximum =
      maximum;

    this.observed =
      observed;

    this.position =
      position;
  }
}


export class DiceFormulaEvaluationError extends Error {

  constructor(
    reason,
    {
      nodeType = null,
      operator = null,
      minimum = null,
      maximum = null,
      observed = undefined,
      cause = null
    } = {}
  ) {

    super(
      reason
    );

    this.name =
      'DiceFormulaEvaluationError';

    this.code =
      'DICE_FORMULA_EVALUATION_ERROR';

    this.reason =
      reason;

    this.nodeType =
      nodeType;

    this.operator =
      operator;

    this.minimum =
      minimum;

    this.maximum =
      maximum;

    this.observed =
      observed;

    if (
      cause !== null
    ) {

      this.cause =
        cause;
    }
  }
}


export function createDefaultDiceRandomInt(
  {
    random = Math.random
  } = {}
) {

  if (
    typeof random !== 'function'
  ) {

    throw createEvaluationError(
      'Default dice random source must be a function'
    );
  }

  return function defaultDiceRandomIntProvider(
    minInclusive,
    maxInclusive
  ) {

    validateRandomRange(
      minInclusive,
      maxInclusive
    );

    let fraction;

    try {

      fraction =
        random();
    } catch (error) {

      throw createEvaluationError(
        'Default dice random source failed',
        {
          cause:
            error
        }
      );
    }

    if (
      typeof fraction !== 'number' ||
      !Number.isFinite(
        fraction
      ) ||
      fraction < 0 ||
      fraction >= 1
    ) {

      throw createEvaluationError(
        'Default dice random source returned an invalid fraction',
        {
          minimum:
            0,
          maximum:
            1,
          observed:
            fraction
        }
      );
    }

    const span =
      maxInclusive - minInclusive + 1;

    return (
      Math.floor(
        fraction * span
      ) + minInclusive
    );
  };
}


export const defaultDiceRandomInt =
  createDefaultDiceRandomInt();


export function parseDiceFormula(
  formula
) {

  if (
    typeof formula !== 'string'
  ) {

    throw createSyntaxError(
      'Formula must be a string',
      0
    );
  }

  assertFormulaLength(
    formula
  );

  const parser =
    new DiceFormulaParser(
      tokenizeFormula(
        formula
      )
    );

  const ast =
    parser.parseExpression();

  parser.expectEnd();

  assertAstNodeLimit(
    ast
  );

  return ast;
}


export function rollDice(
  request,
  {
    randomInt = defaultDiceRandomInt
  } = {}
) {

  const normalizedRequest =
    normalizeRollRequest(
      request
    );

  validateRollOptions(
    normalizedRequest
  );

  validateRandomInt(
    randomInt
  );

  const ast =
    parseDiceFormula(
      normalizedRequest.formula
    );

  const context =
    {
      randomInt,
      formulaOriginal:
        normalizedRequest.formula,
      dice:
        []
    };

  const evaluation =
    evaluateDiceNode(
      ast,
      context
    );

  const total =
    assertSupportedNumber(
      evaluation.total,
      'Roll total is outside the supported numeric range'
    );

  return deepFreeze({
    kind:
      'dice-roll-result',
    version:
      1,
    request: {
      formulaOriginal:
        normalizedRequest.formula,
      formulaNormalized:
        normalizeFormulaForResult(
          normalizedRequest.formula
        ),
      mode:
        normalizedRequest.mode,
      criticalPolicy:
        normalizedRequest.criticalPolicy
    },
    total,
    dice:
      context.dice,
    breakdown:
      evaluation.breakdown,
    critical:
      createCriticalResult(
        normalizedRequest.criticalPolicy
      )
  });
}


class DiceFormulaParser {

  constructor(
    tokens
  ) {

    this.tokens =
      tokens;

    this.index =
      0;
  }


  parseExpression() {

    return this.parseAdditive();
  }


  parseAdditive() {

    let node =
      this.parseMultiplicative();

    while (
      this.peekOperator(
        '+',
        '-'
      )
    ) {

      const operator =
        this.advance();

      const right =
        this.parseMultiplicative();

      node =
        createBinaryNode(
          operator.value,
          node,
          right
        );
    }

    return node;
  }


  parseMultiplicative() {

    let node =
      this.parseUnary();

    while (
      this.peekOperator(
        '*',
        '/'
      )
    ) {

      const operator =
        this.advance();

      const right =
        this.parseUnary();

      node =
        createBinaryNode(
          operator.value,
          node,
          right
        );
    }

    return node;
  }


  parseUnary() {

    if (
      this.peekOperator(
        '+',
        '-'
      )
    ) {

      const operator =
        this.advance();

      const argument =
        this.parseUnary();

      return {
        type:
          'unary',
        operator:
          operator.value,
        argument,
        start:
          operator.start,
        end:
          argument.end
      };
    }

    return this.parsePrimary();
  }


  parsePrimary() {

    const token =
      this.peek();

    if (
      token.type === 'number'
    ) {

      this.advance();

      return {
        type:
          'number',
        value:
          token.value,
        start:
          token.start,
        end:
          token.end
      };
    }

    if (
      token.type === 'dice'
    ) {

      this.advance();

      return {
        type:
          'dice',
        count:
          token.count,
        sides:
          token.sides,
        start:
          token.start,
        end:
          token.end
      };
    }

    if (
      token.type === 'paren' &&
      token.value === '('
    ) {

      this.advance();

      const expression =
        this.parseExpression();

      this.expectClosingParen();

      return expression;
    }

    throw createSyntaxError(
      'Expected a number, dice term or parenthesized expression',
      token.start,
      token.type
    );
  }


  expectClosingParen() {

    const token =
      this.peek();

    if (
      token.type === 'paren' &&
      token.value === ')'
    ) {

      this.advance();
      return;
    }

    throw createSyntaxError(
      'Expected closing parenthesis',
      token.start,
      token.type
    );
  }


  expectEnd() {

    const token =
      this.peek();

    if (
      token.type === TOKEN_EOF
    ) {

      return;
    }

    throw createSyntaxError(
      'Unexpected token after complete formula',
      token.start,
      token.type
    );
  }


  peekOperator(
    ...operators
  ) {

    const token =
      this.peek();

    return (
      token.type === 'operator' &&
      operators.includes(
        token.value
      )
    );
  }


  peek() {

    return this.tokens[this.index];
  }


  advance() {

    const token =
      this.tokens[this.index];

    this.index += 1;

    return token;
  }
}


function normalizeRollRequest(
  request
) {

  if (
    request === null ||
    typeof request !== 'object' ||
    Array.isArray(
      request
    )
  ) {

    throw createEvaluationError(
      'Roll request must be an object'
    );
  }

  const {
    formula,
    mode = 'normal',
    criticalPolicy = 'none'
  } =
    request;

  if (
    typeof formula !== 'string'
  ) {

    throw createEvaluationError(
      'Roll request formula must be a string'
    );
  }

  return {
    formula,
    mode,
    criticalPolicy
  };
}


function validateRollOptions(
  request
) {

  if (
    request.mode !== 'normal'
  ) {

    throw createEvaluationError(
      'Only normal roll mode is supported in this dice engine leaf'
    );
  }

  if (
    request.criticalPolicy !== 'none'
  ) {

    throw createEvaluationError(
      'Only none critical policy is supported in this dice engine leaf'
    );
  }
}


function validateRandomInt(
  randomInt
) {

  if (
    typeof randomInt !== 'function'
  ) {

    throw createEvaluationError(
      'randomInt must be a function'
    );
  }
}


function normalizeFormulaForResult(
  formula
) {

  return formula.replace(
    /\s+/g,
    ''
  );
}


function createCriticalResult(
  criticalPolicy
) {

  return {
    policy:
      criticalPolicy,
    classification:
      'none'
  };
}


function createEvaluation(
  total,
  breakdown
) {

  return {
    total,
    breakdown
  };
}


function evaluateDiceNode(
  node,
  context
) {

  if (
    node.type === 'number'
  ) {

    const total =
      assertSupportedNumber(
        node.value,
        'Number literal is outside the supported numeric range',
        node
      );

    return createEvaluation(
      total,
      {
        kind:
          'number',
        value:
          total,
        total
      }
    );
  }

  if (
    node.type === 'dice'
  ) {

    return evaluateDiceTerm(
      node,
      context
    );
  }

  if (
    node.type === 'unary'
  ) {

    return evaluateUnaryNode(
      node,
      context
    );
  }

  if (
    node.type === 'binary'
  ) {

    return evaluateBinaryNode(
      node,
      context
    );
  }

  throw createEvaluationError(
    'Unsupported dice AST node',
    {
      nodeType:
        node?.type ?? null
    }
  );
}


function evaluateDiceTerm(
  node,
  context
) {

  let total =
    0;

  const faces =
    [];

  for (
    let dieIndex = 0;
    dieIndex < node.count;
    dieIndex += 1
  ) {

    const value =
      rollSingleDie(
        node.sides,
        context.randomInt,
        node
      );

    faces.push(
      value
    );

    total =
      assertSupportedNumber(
        total + value,
        'Dice term total is outside the supported numeric range',
        node
      );
  }

  const diceTermIndex =
    context.dice.length;

  const notation =
    getDiceNotation(
      node,
      context
    );

  const diceTerm =
    {
      kind:
        'dice-term-result',
      diceTermIndex,
      notation,
      count:
        node.count,
      sides:
        node.sides,
      faces,
      total
    };

  context.dice.push(
    diceTerm
  );

  return createEvaluation(
    total,
    {
      kind:
        'dice-term',
      diceTermIndex,
      notation,
      count:
        node.count,
      sides:
        node.sides,
      faces,
      total
    }
  );
}


function getDiceNotation(
  node,
  context
) {

  const fragment =
    context.formulaOriginal.slice(
      node.start,
      node.end
    );

  const normalized =
    normalizeFormulaForResult(
      fragment
    );

  if (
    normalized.length > 0
  ) {

    return normalized;
  }

  return `${node.count}d${node.sides}`;
}


function rollSingleDie(
  sides,
  randomInt,
  node
) {

  let value;

  try {

    value =
      randomInt(
        1,
        sides
      );
  } catch (error) {

    throw createEvaluationError(
      'randomInt provider failed',
      {
        nodeType:
          node.type,
        minimum:
          1,
        maximum:
          sides,
        cause:
          error
      }
    );
  }

  if (
    !Number.isInteger(
      value
    ) ||
    value < 1 ||
    value > sides
  ) {

    throw createEvaluationError(
      'randomInt returned a value outside the requested die range',
      {
        nodeType:
          node.type,
        minimum:
          1,
        maximum:
          sides,
        observed:
          value
      }
    );
  }

  return value;
}


function evaluateUnaryNode(
  node,
  context
) {

  const operand =
    evaluateDiceNode(
      node.argument,
      context
    );

  let total;

  if (
    node.operator === '+'
  ) {

    total =
      assertSupportedNumber(
        operand.total,
        'Unary result is outside the supported numeric range',
        node
      );
  } else if (
    node.operator === '-'
  ) {

    total =
      assertSupportedNumber(
        -operand.total,
        'Unary result is outside the supported numeric range',
        node
      );
  } else {

    throw createEvaluationError(
      'Unsupported unary operator',
      {
        nodeType:
          node.type,
        operator:
          node.operator
      }
    );
  }

  return createEvaluation(
    total,
    {
      kind:
        'unary-operation',
      operator:
        node.operator,
      operand:
        operand.breakdown,
      total
    }
  );
}


function evaluateBinaryNode(
  node,
  context
) {

  const left =
    evaluateDiceNode(
      node.left,
      context
    );

  const right =
    evaluateDiceNode(
      node.right,
      context
    );

  let total;

  if (
    node.operator === '+'
  ) {

    total =
      assertSupportedNumber(
        left.total + right.total,
        'Addition result is outside the supported numeric range',
        node
      );
  } else if (
    node.operator === '-'
  ) {

    total =
      assertSupportedNumber(
        left.total - right.total,
        'Subtraction result is outside the supported numeric range',
        node
      );
  } else if (
    node.operator === '*'
  ) {

    total =
      assertSupportedNumber(
        left.total * right.total,
        'Multiplication result is outside the supported numeric range',
        node
      );
  } else if (
    node.operator === '/'
  ) {

    if (
      right.total === 0
    ) {

      throw createEvaluationError(
        'Division by zero is not allowed',
        {
          nodeType:
            node.type,
          operator:
            node.operator
        }
      );
    }

    total =
      assertSupportedNumber(
        left.total / right.total,
        'Division result is outside the supported numeric range',
        node
      );
  } else {

    throw createEvaluationError(
      'Unsupported binary operator',
      {
        nodeType:
          node.type,
        operator:
          node.operator
      }
    );
  }

  return createEvaluation(
    total,
    {
      kind:
        'binary-operation',
      operator:
        node.operator,
      left:
        left.breakdown,
      right:
        right.breakdown,
      total
    }
  );
}


function assertSupportedNumber(
  value,
  reason,
  node = null
) {

  if (
    !Number.isFinite(
      value
    ) ||
    Math.abs(
      value
    ) > DICE_ENGINE_LIMITS.MAX_SAFE_NUMBER
  ) {

    throw createLimitError(
      reason,
      {
        limitKind:
          'MAX_SAFE_NUMBER',
        maximum:
          DICE_ENGINE_LIMITS.MAX_SAFE_NUMBER,
        observed:
          value,
        position:
          node?.start ?? null
      }
    );
  }

  return value;
}


function deepFreeze(
  value,
  seen = new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(
      value
    )
  ) {

    return value;
  }

  seen.add(
    value
  );

  for (
    const child of Object.values(
      value
    )
  ) {

    deepFreeze(
      child,
      seen
    );
  }

  return Object.freeze(
    value
  );
}


function validateRandomRange(
  minInclusive,
  maxInclusive
) {

  if (
    !Number.isSafeInteger(
      minInclusive
    ) ||
    !Number.isSafeInteger(
      maxInclusive
    ) ||
    minInclusive > maxInclusive
  ) {

    throw createEvaluationError(
      'randomInt range must use safe integer bounds'
    );
  }
}


function tokenizeFormula(
  formula
) {

  const tokens =
    [];

  const diceLimitTracker =
    createDiceLimitTracker();

  let parenthesesDepth =
    0;

  let index =
    0;

  while (
    index < formula.length
  ) {

    const char =
      formula[index];

    if (
      isWhitespace(
        char
      )
    ) {

      index += 1;
      continue;
    }

    if (
      isDigit(
        char
      )
    ) {

      const unsigned =
        readUnsignedInteger(
          formula,
          index
        );

      if (
        formula[unsigned.end] === 'd'
      ) {

        const diceToken =
          readDiceAfterCount(
            formula,
            index,
            unsigned
        );

        trackDiceToken(
          diceLimitTracker,
          diceToken.token
        );

        tokens.push(
          diceToken.token
        );

        index =
          diceToken.end;
        continue;
      }

      tokens.push({
        type:
          'number',
        value:
          unsigned.value,
        start:
          unsigned.start,
        end:
          unsigned.end
      });

      index =
        unsigned.end;
      continue;
    }

    if (
      char === 'd'
    ) {

      const diceToken =
        readDiceWithoutCount(
          formula,
          index
      );

      trackDiceToken(
        diceLimitTracker,
        diceToken.token
      );

      tokens.push(
        diceToken.token
      );

      index =
        diceToken.end;
      continue;
    }

    if (
      BINARY_OPERATORS.has(
        char
      )
    ) {

      tokens.push({
        type:
          'operator',
        value:
          char,
        start:
          index,
        end:
          index + 1
      });

      index += 1;
      continue;
    }

    if (
      char === '(' ||
      char === ')'
    ) {

      if (
        char === '('
      ) {

        parenthesesDepth += 1;

        assertLimitWithinMaximum(
          'MAX_PARENTHESES_DEPTH',
          DICE_ENGINE_LIMITS.MAX_PARENTHESES_DEPTH,
          parenthesesDepth,
          'Parentheses nesting exceeds the configured limit',
          index
        );
      } else {

        parenthesesDepth =
          Math.max(
            0,
            parenthesesDepth - 1
          );
      }

      tokens.push({
        type:
          'paren',
        value:
          char,
        start:
          index,
        end:
          index + 1
      });

      index += 1;
      continue;
    }

    throw createSyntaxError(
      `Unsupported character "${char}"`,
      index
    );
  }

  tokens.push({
    type:
      TOKEN_EOF,
    start:
      formula.length,
    end:
      formula.length
  });

  return tokens;
}


function readDiceAfterCount(
  formula,
  start,
  countInteger
) {

  if (
    countInteger.value < 1
  ) {

    throw createSyntaxError(
      'Dice count must be greater than zero',
      countInteger.start,
      'dice'
    );
  }

  assertLimitWithinMaximum(
    'MAX_DICE_PER_TERM',
    DICE_ENGINE_LIMITS.MAX_DICE_PER_TERM,
    countInteger.value,
    'Dice count exceeds the configured per-term limit',
    countInteger.start
  );

  const sidesStart =
    countInteger.end + 1;

  const sides =
    readDiceSides(
      formula,
      sidesStart
    );

  return {
    token: {
      type:
        'dice',
      count:
        countInteger.value,
      sides:
        sides.value,
      start,
      end:
        sides.end
    },
    end:
      sides.end
  };
}


function readDiceWithoutCount(
  formula,
  start
) {

  const sidesStart =
    start + 1;

  const sides =
    readDiceSides(
      formula,
      sidesStart
    );

  return {
    token: {
      type:
        'dice',
      count:
        1,
      sides:
        sides.value,
      start,
      end:
        sides.end
    },
    end:
      sides.end
  };
}


function readDiceSides(
  formula,
  start
) {

  if (
    !isDigit(
      formula[start]
    )
  ) {

    throw createSyntaxError(
      'Expected dice sides after d',
      start,
      'dice'
    );
  }

  const sides =
    readUnsignedInteger(
      formula,
      start
    );

  if (
    sides.value < 1
  ) {

    throw createSyntaxError(
      'Dice sides must be greater than zero',
      sides.start,
      'dice'
    );
  }

  assertLimitWithinMaximum(
    'MAX_DIE_SIDES',
    DICE_ENGINE_LIMITS.MAX_DIE_SIDES,
    sides.value,
    'Dice sides exceed the configured limit',
    sides.start
  );

  return sides;
}


function readUnsignedInteger(
  formula,
  start
) {

  let end =
    start;

  while (
    isDigit(
      formula[end]
    )
  ) {

    end += 1;
  }

  const text =
    formula.slice(
      start,
      end
    );

  const value =
    Number(
      text
    );

  if (
    !Number.isSafeInteger(
      value
    )
  ) {

    throw createSyntaxError(
      'Integer is outside the supported safe range',
      start,
      'number'
    );
  }

  return {
    value,
    start,
    end
  };
}


function createBinaryNode(
  operator,
  left,
  right
) {

  return {
    type:
      'binary',
    operator,
    left,
    right,
    start:
      left.start,
    end:
      right.end
  };
}


function assertFormulaLength(
  formula
) {

  assertLimitWithinMaximum(
    'MAX_FORMULA_LENGTH',
    DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH,
    formula.length,
    'Formula length exceeds the configured limit',
    0
  );
}


function assertAstNodeLimit(
  ast
) {

  const nodeCount =
    countAstNodes(
      ast
    );

  assertLimitWithinMaximum(
    'MAX_AST_NODES',
    DICE_ENGINE_LIMITS.MAX_AST_NODES,
    nodeCount,
    'Formula AST node count exceeds the configured limit'
  );
}


function countAstNodes(
  node
) {

  if (
    node.type === 'number' ||
    node.type === 'dice'
  ) {

    return 1;
  }

  if (
    node.type === 'unary'
  ) {

    return (
      1 +
      countAstNodes(
        node.argument
      )
    );
  }

  if (
    node.type === 'binary'
  ) {

    return (
      1 +
      countAstNodes(
        node.left
      ) +
      countAstNodes(
        node.right
      )
    );
  }

  return 1;
}


function createDiceLimitTracker() {

  return {
    diceTerms:
      0,
    totalDice:
      0
  };
}


function trackDiceToken(
  tracker,
  token
) {

  tracker.diceTerms += 1;

  assertLimitWithinMaximum(
    'MAX_DICE_TERMS',
    DICE_ENGINE_LIMITS.MAX_DICE_TERMS,
    tracker.diceTerms,
    'Dice term count exceeds the configured limit',
    token.start
  );

  tracker.totalDice +=
    token.count;

  assertLimitWithinMaximum(
    'MAX_TOTAL_DICE',
    DICE_ENGINE_LIMITS.MAX_TOTAL_DICE,
    tracker.totalDice,
    'Total dice count exceeds the configured limit',
    token.start
  );
}


function assertLimitWithinMaximum(
  limitKind,
  maximum,
  observed,
  reason,
  position = null
) {

  if (
    observed > maximum
  ) {

    throw createLimitError(
      reason,
      {
        limitKind,
        maximum,
        observed,
        position
      }
    );
  }
}


function createSyntaxError(
  reason,
  position,
  tokenType = null
) {

  return new DiceFormulaSyntaxError(
    reason,
    {
      position,
      tokenType
    }
  );
}


function createLimitError(
  reason,
  options
) {

  return new DiceFormulaLimitError(
    reason,
    options
  );
}


function createEvaluationError(
  reason,
  options = {}
) {

  return new DiceFormulaEvaluationError(
    reason,
    options
  );
}


function isDigit(
  char
) {

  return (
    char >= '0' &&
    char <= '9'
  );
}


function isWhitespace(
  char
) {

  return (
    char === ' ' ||
    char === '\n' ||
    char === '\r' ||
    char === '\t'
  );
}
