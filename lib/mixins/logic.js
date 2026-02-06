import { getRoot, printSource } from '@bablr/agast-helpers/tree';
import {
  buildAlternative,
  buildAlternatives,
  buildElements,
  buildLiteralElements,
  buildPattern,
  buildRegexGroup,
  buildString,
} from '@bablr/helpers/builders';
import { spam as m, re } from '@bablr/boot';
import {
  defineAttribute,
  eat,
  eatHeld,
  eatMatch,
  startSpan,
  endSpan,
  fail,
  match,
  o,
  startSubspan,
} from '@bablr/helpers/grammar';

let { freeze } = Object;

let keyword = buildString('Keyword');

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

const buildOperatorAlternatives = (categories) =>
  buildAlternatives(
    categories.flatMap((operators) =>
      operators.map((op) => buildAlternative(buildLiteralElements(op))),
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

let assignmentMatcher;
let binaryExpressionMatchers = new Map();
let logicExpressionMatchers = new Map();

const mixin = (Base) =>
  class ES3LogicGrammar extends Base {
    static get assignables() {
      return ['MemberExpression', 'Identifier'];
    }

    constructor() {
      super();

      this.attributes = new Map([
        ...(this.attributes || []),
        ...Object.entries({
          UnaryExpression: { position: undefined },
        }),
      ]);
    }

    *LogicExpression({ language, s, props: { power = 34, noIn = false } }) {
      let { held } = s();
      if (!held) return;

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

      op = printSource(op);

      let res;
      if (power >= 2 && ['.', '['].includes(op)) {
        res = yield eat(m`<MemberExpression />`, o({ power }));
      }
      if (!res && power >= 6 && op == '(') {
        res = yield eat(m`<CallExpression />`, o({ power }));
      }
      if (!res && power >= 8 && unaryPostfixOperators.includes(op)) {
        res = yield eat(m`<UnaryExpression />`, o({ op, power }));
      }
      if (!res && power >= 12) {
        for (let powerRank of binaryExpressionPowerRank.slice(Math.max(0, (30 - power) / 2 - 1))) {
          if (powerRank.includes(op)) {
            res = yield eat(m`<BinaryExpression />`, o({ op, power, noIn }));
          }
        }
      }
      if (!res && power >= 32) {
        if (
          language.grammar.assignables.includes(getRoot(held).value.name.description) &&
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

    *UnaryExpression({ literalValue, props: { power, op = printSource(literalValue) }, s }) {
      let ownPower = 0;
      let pre;
      if (!s().holding) {
        pre = yield eat(
          m`sigilToken*: <*${op && /[a-z]/.test(op[0]) ? keyword : null} ${buildPattern(
            unaryPrefixOperatorAlternatives,
          )} />`,
        );
      }
      if (pre) {
        ownPower = 10;
        yield eat(m`argument+$: <_Expression />`);
      } else {
        yield eatHeld(m`argument+$: <_Expression />`);
      }

      if (!pre) {
        yield eat(m`sigilToken*: <* ${buildPattern(unaryPostfixOperatorAlternatives)} />`);
        ownPower = 12;
      }

      if (ownPower > power) yield fail();

      yield defineAttribute('position', pre ? 'prefix' : 'suffix');
    }

    *BinaryExpression({ props: { op, power, noIn } }) {
      yield eatHeld(m`left+$: <_Expression />`, o({ power: power - 2 }));

      let matcherCache = binaryExpressionMatchers;
      let pattern = matcherCache.get(power);

      if (!op) {
        op = printSource(yield match(buildPattern(getBinaryOperatorAlternatives(power))));
      }

      pattern ??= buildPattern(getBinaryOperatorAlternatives(power));

      matcherCache.set(power, pattern);

      yield eat(
        m`sigilToken*: <*${['instanceof', 'in'].includes(op) ? keyword : null} ${pattern} />`,
      );

      if (op === 'in' && noIn) yield fail();

      let ownPower = getBinaryOperatorPower(op);

      yield eat(m`right+$: <_Expression />`, o({ power: ownPower - 2 }));
    }

    *AssignmentExpression() {
      yield eatHeld(m`left+$: <_Expression />`, o({ power: 2 }));
      assignmentMatcher ??= m`assignmentOperator*: <* ${buildPattern(
        assignmentOperatorAlternatives,
      )} />`;
      yield eat(assignmentMatcher);
      yield eat(m`right+$: <_Expression />`, o({ power: 32 }));
    }

    *MemberExpression() {
      yield eatHeld(m`object+$: <_Expression />`, o({ power: 2 }));
      let sigil = yield match(re`/[[.]/`);
      switch (printSource(sigil)) {
        case '.': {
          yield eat(m`dotToken*: <* '.' />`);
          yield eat(m`property+$: <Identifier />`, o({ scoped: false }));
          break;
        }

        case '[': {
          yield eat(m`openToken*: <* '[' />`);
          yield startSpan('Bare', ']');
          yield eat(m`property+$: <_Expression />`);
          yield endSpan();
          yield eat(m`closeToken*: <* ']' />`);
          break;
        }

        default:
          yield fail();
      }
    }

    *TernaryExpression() {
      yield startSpan('Bare', '?');
      yield eatHeld(m`test+$: <_Expression />`, o({ power: 32 }));
      yield endSpan();

      yield eat(m`consequentSigilToken*: <* '?' />`);

      yield startSpan('Bare', ':');
      yield eat(m`consequent+$: <_Expression />`, o({ power: 32 }));
      yield endSpan();

      yield eat(m`alternateSigilToken*: <* ':' />`);

      yield eat(m`alternate+$: <_Expression />`, o({ power: 32 }));
    }

    *SequenceExpression() {
      yield startSubspan(null, ',');
      yield eatHeld(m`elements[]+$: <_Expression />`, o({ power: 32 }));
      yield endSpan();

      let count = 1;
      while (yield eatMatch(m`#separatorTokens: <* ',' />`)) {
        yield startSubspan(null, ',');
        yield eatMatch(m`elements[]+$: <_Expression />`);
        yield endSpan();

        count++;
      }
      if (count === 1) yield fail();
    }
  };

export default mixin;
