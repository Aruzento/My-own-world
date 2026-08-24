const TOKEN_EOF =
  'eof';

const BINARY_OPERATORS =
  new Set([
    '+',
    '-',
    '*',
    '/'
  ]);


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


export class DiceFormulaEvaluationError extends Error {

  constructor(
    reason,
    {
      nodeType = null,
      operator = null
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
  }
}


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

  const parser =
    new DiceFormulaParser(
      tokenizeFormula(
        formula
      )
    );

  const ast =
    parser.parseExpression();

  parser.expectEnd();

  return ast;
}


export function rollDice(
  request,
  {
    randomInt = defaultRandomInt
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
      rolls: []
    };

  const total =
    assertSupportedNumber(
      evaluateDiceNode(
        ast,
        context
      ),
      'Roll total is outside the supported numeric range'
    );

  return {
    type:
      'rollResult',
    formula:
      normalizedRequest.formula,
    mode:
      normalizedRequest.mode,
    criticalPolicy:
      normalizedRequest.criticalPolicy,
    total,
    rolls:
      context.rolls
  };
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


function evaluateDiceNode(
  node,
  context
) {

  if (
    node.type === 'number'
  ) {

    return assertSupportedNumber(
      node.value,
      'Number literal is outside the supported numeric range',
      node
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

    context.rolls.push({
      index:
        context.rolls.length,
      dieIndex,
      count:
        node.count,
      sides:
        node.sides,
      value,
      start:
        node.start,
      end:
        node.end
    });

    total =
      assertSupportedNumber(
        total + value,
        'Dice term total is outside the supported numeric range',
        node
      );
  }

  return total;
}


function rollSingleDie(
  sides,
  randomInt,
  node
) {

  const value =
    randomInt(
      1,
      sides
    );

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
          node.type
      }
    );
  }

  return value;
}


function evaluateUnaryNode(
  node,
  context
) {

  const value =
    evaluateDiceNode(
      node.argument,
      context
    );

  if (
    node.operator === '+'
  ) {

    return assertSupportedNumber(
      value,
      'Unary result is outside the supported numeric range',
      node
    );
  }

  if (
    node.operator === '-'
  ) {

    return assertSupportedNumber(
      -value,
      'Unary result is outside the supported numeric range',
      node
    );
  }

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

  if (
    node.operator === '+'
  ) {

    return assertSupportedNumber(
      left + right,
      'Addition result is outside the supported numeric range',
      node
    );
  }

  if (
    node.operator === '-'
  ) {

    return assertSupportedNumber(
      left - right,
      'Subtraction result is outside the supported numeric range',
      node
    );
  }

  if (
    node.operator === '*'
  ) {

    return assertSupportedNumber(
      left * right,
      'Multiplication result is outside the supported numeric range',
      node
    );
  }

  if (
    node.operator === '/'
  ) {

    if (
      right === 0
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

    return assertSupportedNumber(
      left / right,
      'Division result is outside the supported numeric range',
      node
    );
  }

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
    ) > Number.MAX_SAFE_INTEGER
  ) {

    throw createEvaluationError(
      reason,
      {
        nodeType:
          node?.type ?? null,
        operator:
          node?.operator ?? null
      }
    );
  }

  return value;
}


function defaultRandomInt(
  minInclusive,
  maxInclusive
) {

  validateRandomRange(
    minInclusive,
    maxInclusive
  );

  const span =
    maxInclusive - minInclusive + 1;

  return (
    Math.floor(
      Math.random() * span
    ) + minInclusive
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
