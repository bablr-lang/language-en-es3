import { getRoot, printSource } from '@bablr/agast-helpers/tree';
import {
  buildAlternative,
  buildAlternatives,
  buildElements,
  buildPattern,
  buildRegexGroup,
} from '@bablr/helpers/builders';
import { spam as m, re } from '@bablr/boot';
import { defineAttribute, eat, eatMatch, fail, match, o } from '@bablr/helpers/grammar';

let { freeze } = Object;

export const powerLevels = freeze([
  freeze({ type: 'comma', lower: 'assign', higher: null }),
  freeze({ type: 'assign', lower: 'logical-or', higher: 'comma' }),
  freeze({ type: 'logical-or', lower: 'logical-and', higher: 'assign' }),
  freeze({ type: 'logical-and', lower: 'bitwise-or', higher: 'logical-or' }),
  freeze({ type: 'bitwise-or', lower: 'bitwise-xor', higher: 'logical-and' }),
  freeze({ type: 'bitwise-xor', lower: 'bitwise-and', higher: 'bitwise-or' }),
  freeze({ type: 'bitwise-and', lower: 'equals', higher: 'bitwise-xor' }),
  freeze({ type: 'equals', lower: 'compare', higher: 'bitwise-and' }),
  freeze({ type: 'compare', lower: 'bitwise-shift', higher: 'equals' }),
  freeze({ type: 'bitwise-shift', lower: 'add', higher: 'compare' }),
  freeze({ type: 'add', lower: 'multiply', higher: 'bitwise-shift' }),
  freeze({ type: 'multiply', lower: 'unary-prefix', higher: 'add' }),
  freeze({ type: 'unary-prefix', lower: 'unary-postfix', higher: 'multiply' }),
  freeze({ type: 'unary-postfix', lower: 'call', higher: 'unary-prefix' }),
  freeze({ type: 'call', lower: 'new', higher: 'unary-postfix' }),
  freeze({ type: 'new', lower: 'access', higher: 'call' }),
  freeze({ type: 'access', lower: null, higher: 'new' }),
]);

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

const buildOperatorAlternatives = (categories) =>
  buildAlternatives(
    categories.flatMap((operators) =>
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

export const assignmentOperators = freeze([
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
]);
export const assignmentOperatorAlternatives = buildOperatorAlternatives([assignmentOperators]);

export const unaryPrefixOperators = freeze([
  'typeof',
  'void',
  'delete',
  '++',
  '--',
  '+',
  '-',
  '!',
  '~',
]);
export const unaryPrefixOperatorAlternatives = buildOperatorAlternatives([unaryPrefixOperators]);

export const unaryPostfixOperators = freeze(['++', '--']);
export const unaryPostfixOperatorAlternatives = buildOperatorAlternatives([unaryPostfixOperators]);

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

export const getBinaryOperatorAlternatives = (power) => {
  return buildOperatorAlternatives(
    binaryExpressionPowerRank.slice(Math.max(0, (30 - power) / 2 - 1)),
  );
};

const getBinaryOperatorPower = (str) => {
  let idx = binaryExpressionPowerRank.findIndex((arr) => arr.includes(str));
  return idx >= 0 ? (15 - idx) * 2 : null;
};

let unaryPrefixMatcher;
let unaryPostfixMatcher;
let assignmentMatcher;
let binaryExpressionMatchers = new Map();
let logicExpressionMatchers = new Map();

const mixin = (Base) =>
  class ES3LogicGrammar extends Base {
    constructor() {
      super();

      this.attributes = new Map([
        ...(this.attributes || []),
        ...Object.entries({
          UnaryExpression: { power: undefined, position: undefined },
          BinaryExpression: { power: undefined },
          AssignmentExpression: { power: undefined },
          MemberExpression: { power: undefined },
          TernaryExpression: { power: undefined },
          SequenceExpression: { power: undefined },
        }),
      ]);
    }

    *LogicExpression({ s, props: { power = 34, noIn = false } }) {
      if (!s().held) return;

      let matcherCache = logicExpressionMatchers;
      let matcher = matcherCache.get(power);

      matcher ??= re`/(?:[[.(?,]|===?|${buildRegexGroup(
        unaryPostfixOperatorAlternatives,
      )}|${buildRegexGroup(assignmentOperatorAlternatives)}|${buildRegexGroup(
        getBinaryOperatorAlternatives(power),
      )})/`;

      matcherCache.set(power, matcher);

      let op = yield match(matcher);

      if (!op) return;

      op = op.children[1][0]?.value;

      let res;
      if (power >= 2 && ['.', '['].includes(op)) {
        res = yield eat(m`<MemberExpression />`, o({ power }));
      }
      if (!res && power >= 6 && op == '(') {
        res = yield eat(m`<CallExpression />`, o({ power }));
      }
      if (!res && power >= 8 && unaryPostfixOperators.includes(op)) {
        res = yield eat(m`<UnaryExpression />`, o({ power }));
      }
      if (!res && power >= 12) {
        for (let powerRank of binaryExpressionPowerRank.slice(Math.max(0, (30 - power) / 2 - 1))) {
          if (powerRank.includes(op)) {
            res = yield eat(m`<BinaryExpression />`, o({ power, noIn }));
          }
        }
      }
      if (!res && power >= 32) {
        if (
          assignmentOperators.includes(op) &&
          (res = yield eat(m`<AssignmentExpression />`, o({ power })))
        ) {
        } else if (op === '?' && (res = yield eat(m`<TernaryExpression />`, o({ power })))) {
        }
      }
      if (!res && power >= 34 && op === ',') {
        res = yield eat(m`<SequenceExpression />`, o({ power }));
      }
    }

    *UnaryExpression({ props: { power }, s }) {
      let ownPower = 0;
      let op;
      if (!s().holding) {
        yield eatMatch(m`argument+$: null`);
        unaryPrefixMatcher ??= m`sigilToken*: <* ${buildPattern(
          unaryPrefixOperatorAlternatives,
        )} />`;
        op = yield eatMatch(unaryPrefixMatcher);
      }
      if (op) ownPower = 10;
      yield eat(m`argument+$: <_Expression />`, o({ power: ownPower - 2 }));

      if (!op) {
        unaryPostfixMatcher ??= m`sigilToken*: <* ${buildPattern(
          unaryPostfixOperatorAlternatives,
        )} />`;
        yield eat(unaryPostfixMatcher);
        ownPower = 12;
      }

      if (ownPower > power) yield fail();

      yield defineAttribute('power', ownPower);
      yield defineAttribute('position', op ? 'prefix' : 'suffix');
    }

    *BinaryExpression({ props: { power, noIn } }) {
      yield eat(m`left+$: <_Expression />`, o({ power: power - 2 }));

      let matcherCache = binaryExpressionMatchers;
      let matcher = matcherCache.get(power);

      matcher ??= m`sigilToken*: <* ${buildPattern(getBinaryOperatorAlternatives(power))} />`;

      matcherCache.set(power, matcher);

      let op = yield eat(matcher);

      let opTxt = printSource(op.node).trim();

      if (opTxt === 'in' && noIn) yield fail();

      let ownPower = getBinaryOperatorPower(opTxt);

      yield eat(m`right+$: <_Expression />`, o({ power: ownPower - 2 }));

      yield defineAttribute('power', ownPower);
    }

    *AssignmentExpression() {
      let lhs = yield eat(m`left+$: <_Expression />`, o({ power: 2 }));
      yield defineAttribute('power', 32);
      if (!['MemberExpression', 'Identifier'].includes(getRoot(lhs.node).type.description)) {
        yield fail();
      }
      assignmentMatcher ??= m`assignmentOperator*: <* ${buildPattern(
        assignmentOperatorAlternatives,
      )} />`;
      yield eat(assignmentMatcher);
      yield eat(m`right+$: <_Expression />`, o({ power: 32 }));
    }

    *MemberExpression() {
      yield eat(m`object+$: <_Expression />`, o({ power: 2 }));
      yield defineAttribute('power', 2);
      let sigil = yield match(re`/[[.]/`);
      switch (printSource(sigil)) {
        case '.': {
          yield eat(m`dotToken*: <* '.' />`);
          yield eat(m`openToken*: null`);
          yield eat(m`property+$: <Identifier />`, o({ scoped: false }));
          yield eat(m`closeToken*: null`);
          break;
        }

        case '[': {
          yield eat(m`dotToken*: null`);
          yield eat(m`openToken*: <* '[' />`);
          yield eat(m`property+$: <_Expression />`);
          yield eat(m`closeToken*: <* ']' />`);
          break;
        }

        default:
          yield fail();
      }
    }

    *TernaryExpression() {
      yield eat(m`test+$: <_Expression />`, o({ power: 32 }));
      yield defineAttribute('power', 32);

      yield eat(m`consequentSigilToken*: <* '?' />`);
      yield eat(m`consequent+$: <_Expression />`, o({ power: 32 }));
      yield eat(m`alternateSigilToken*: <* ':' />`);
      yield eat(m`alternate+$: <_Expression />`, o({ power: 32 }));
    }

    *SequenceExpression() {
      let count = 0;

      do {
        yield eatMatch(m`elements[]+$: <_Expression />`, o({ power: 32 }));

        if (!count) {
          yield defineAttribute('power', 34);
        }
        count++;
      } while (yield eatMatch(m`#separatorTokens: <* ',' />`));
      if (count === 1) yield fail();
    }
  };

export default mixin;
