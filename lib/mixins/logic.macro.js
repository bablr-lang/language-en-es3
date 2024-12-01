import { getRoot } from '@bablr/agast-helpers/tree';
import {
  buildNumber,
  buildPattern,
  buildAlternative,
  buildAlternatives,
  buildElements,
} from '@bablr/agast-vm-helpers';
import { i, re } from '@bablr/boot';
import { UnboundAttributes, Node } from '@bablr/helpers/decorators';

// problem: the concrete syntax is only right in some contexts (spans)
const escaped = {
  '\\': re.Character`\\`,
  '/': re.Character`\/`,
  '(': re.Character`\(`,
  ')': re.Character`\)`,
  '{': re.Character`\{`,
  '}': re.Character`\}`,
  '+': re.Character`\+`,
  '*': re.Character`\*`,
  '<': re.Character`\<`,
  '>': re.Character`\>`,
  '^': re.Character`\^`,
  '|': re.Character`\|`,
};

const buildOperatorPattern = (operators) =>
  buildPattern(
    buildAlternatives(
      operators.map((op) =>
        buildAlternative(
          buildElements(
            [...op].map((chr) => {
              if ('\\/(){}+*^$?|<>'.includes(chr)) {
                return getRoot(escaped[chr]);
              } else {
                return getRoot(
                  re.Character({
                    raw: [chr],
                  }),
                );
              }
            }),
          ),
        ),
      ),
    ),
  );

const assignmentOperators = [
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '<<=',
  '>>=',
  '>>>=',
  '&=',
  '^=',
  '|=',
];
const assignmentOperatorPattern = buildOperatorPattern(assignmentOperators);

const unaryPrefixOperators = ['typeof', 'void', 'delete', '++', '--', '+', '-', '!', '~'];
const unaryPrefixOperatorPattern = buildOperatorPattern(unaryPrefixOperators);

const unaryPostfixOperators = ['++', '--'];
const unaryPostfixOperatorPattern = buildOperatorPattern(unaryPostfixOperators);

const binaryExpressionPowerRank = [
  ['||'],
  ['&&'],
  ['|'],
  ['^'],
  ['&'],
  ['===', '==', '!==', '!='],
  ['<=', '<', '>=', '>', 'instanceof', 'in'],
  ['>>>', '<<', '>>'],
  ['+', '-'],
  ['%', '*', '/'],
];

export const getBinaryOperatorPattern = (power) => {
  return buildOperatorPattern(binaryExpressionOperators);
};

export const mixin = (Base) =>
  class ES3LogicGrammar extends Base {
    *Expression({ attributes: attrs, s }) {
      const { power = 18 } = attrs;
      if (power >= 5) {
        yield i`eat(<LogicExpression power=${buildNumber(power)} />)`;
      }
    }

    *LogicExpression({ attributes: attrs }) {
      const { power = 17 } = attrs;
      let res;
      if (power >= 17) {
        res = yield i`eat(<AssignmentExpression power=4 />)`;
      } else if (power >= 7) {
        res = yield i`eat(<BinaryExpression power=${power} />)`;
      } else if (power >= 5) {
        res = yield i`eat(<UnaryExpression power=${power} />)`;
      }

      const opPower = res.attributes.power;

      return i`shiftMatch(<+Expression power=${opPower} />)`;
    }

    @Node
    *UnaryExpression() {
      yield i`eat(<*Punctuator ${unaryOperatorPattern} /> 'sigilToken')`;
      yield i`eat(<+Expression /> 'argument')`;
    }

    @UnboundAttributes(['power'])
    @Node
    *BinaryExpression({ attributes: attrs }) {
      yield i`eat(<+Expression power=${power - 1} /> 'left')`;
      yield i`eat(<*Punctuator ${getBinaryOperatorPattern(leftPower + 1)} /> 'sigilToken')`;
      yield i`eat(<+Expression power=${opPower - 1} /> 'right')`;
    }

    @Node
    *AssignmentExpression() {
      yield i`eat(<*Identifier /> 'left')`;
      yield i`eat(<*Punctuator ${assignmentOperatorPattern} /> 'sigilToken')`;
      yield i`eat(<+Expression power=${opPower - 1} /> 'right')`;
    }
  };
