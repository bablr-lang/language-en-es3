import { i, re } from '@bablr/boot';
import { Node } from '@bablr/helpers/decorators';

const buildOperatorPattern = (operators) =>
  re`/${[...operators].map((op) =>
    re.Alternative(re.Sequence([...op].map((chr) => re.Literal(chr)))),
  )}/`;

export const unaryExpressionOperators = new Set(['+', '-', '~', 'typeof', 'void', 'delete']);
export const unaryOperatorPattern = buildOperatorPattern(unaryExpressionOperators);

export const binaryExpressionOperators = new Set([
  '+',
  '-',
  '*',
  '**',
  '/',
  '&&',
  '||',
  '&',
  '|',
  '^',
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '<=',
  '>',
  '>=',
  'instanceof',
  'in',
  '<<',
  '>>',
]);
export const binaryOperatorPattern = buildOperatorPattern(binaryExpressionOperators);

export const mixin = (Base) =>
  class ES3LogicGrammar extends Base {
    @Node
    *UnaryExpression() {
      yield i`eat(<*Punctuator ${unaryOperatorPattern}> 'sigilToken')`;
      yield i`eat(<+Expression> 'argument')`;
    }

    @Node
    *BinaryExpression() {
      yield i`eat(<+Expression> 'left')`;
      yield i`eat(<*Punctuator ${binaryOperatorPattern}> 'sigilToken')`;
      yield i`eat(<+Expression> 'right')`;
    }
  };
