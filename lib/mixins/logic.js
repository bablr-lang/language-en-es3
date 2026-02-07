import { getRoot, printSource } from '@bablr/agast-helpers/tree';
import {
  buildAlternative,
  buildAlternatives,
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

export const getBinaryOperatorAlternatives = (powers, power) => {
  return buildOperatorAlternatives(
    binaryExpressionPowerRank.slice(Math.max(0, powers.logical_or - power)),
  );
};

const getBinaryOperatorPower = (p, str) => {
  let idx = binaryExpressionPowerRank.findIndex((arr) => arr.includes(str));
  return idx >= 0 ? p.logical_or - idx : null;
};

let assignmentMatcher;
let binaryExpressionMatchers = new Map();
let logicExpressionMatchers = new Map();

let powers = freeze({
  comma: 16,
  assign: 15,
  logical_or: 14,
  logical_and: 13,
  bitwise_or: 12,
  bitwise_xor: 11,
  bitwise_and: 10,
  equals: 9,
  compare: 8,
  bitwise_shift: 7,
  add: 6,
  multiply: 5,
  unary_prefix: 4,
  unary_postfix: 3,
  call: 2,
  new: 1,
  access: 0,
});

let powerNames = freeze(Object.keys(powers));

const mixin = (Base) =>
  class ES3LogicGrammar extends Base {
    static get assignables() {
      return ['MemberExpression', 'Identifier'];
    }

    static get powers() {
      return powers;
    }

    static get powerNames() {
      return powerNames;
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

    *LogicExpression({ language, s, props: { power, noIn = false } }) {
      let { held } = s();
      if (!held) return;
      let { powers: p } = this.constructor;

      let power_ = power || p.comma;

      let matcherCache = logicExpressionMatchers;
      let matcher = matcherCache.get(power_);

      matcher ??= re`/(?:[[.(?,]|===?|${buildRegexGroup(
        unaryPostfixOperatorAlternatives,
      )}|${buildRegexGroup(assignmentOperatorAlternatives)}|${buildRegexGroup(
        getBinaryOperatorAlternatives(p, power_),
      )})/`;

      matcherCache.set(power_, matcher);

      let op = yield match(matcher);

      if (!op) return;

      op = printSource(op);

      let res;
      if (power_ >= p.access && ['.', '['].includes(op)) {
        res = yield eat(m`<MemberExpression />`, o({ power: power_ }));
      }
      if (!res && power_ >= p.call && op == '(') {
        res = yield eat(m`<CallExpression />`, o({ power: power_ }));
      }
      if (!res && power_ >= p.unary_postfix && unaryPostfixOperators.includes(op)) {
        res = yield eat(m`<UnaryExpression />`, o({ op, power: power_ }));
      }
      if (!res && power_ >= p.multiply) {
        for (let powerRank of binaryExpressionPowerRank.slice(Math.max(0, p.logical_or - power_))) {
          if (powerRank.includes(op)) {
            res = yield eat(m`<BinaryExpression />`, o({ op, power: power_, noIn }));
          }
        }
      }
      if (!res && power_ >= p.assign) {
        if (
          language.grammar.assignables.includes(getRoot(held).value.name.description) &&
          assignmentOperators.includes(op) &&
          (res = yield eat(m`<AssignmentExpression />`, o({ power: power_ })))
        ) {
        } else if (
          op === '?' &&
          (res = yield eat(m`<TernaryExpression />`, o({ power: power_ })))
        ) {
        }
      }
      if (!res && power_ >= p.comma && op === ',') {
        res = yield eat(m`<SequenceExpression />`, o({ power: power_ }));
      }
    }

    *UnaryExpression({ literalValue, props: { power, op = printSource(literalValue) }, s }) {
      let { powers: p } = this.constructor;
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
        ownPower = p.unary_postfix + 1;
        yield eat(m`argument+$: <_Expression />`);
      } else {
        yield eatHeld(m`argument+$: <_Expression />`);
      }

      if (!pre) {
        yield eat(m`sigilToken*: <* ${buildPattern(unaryPostfixOperatorAlternatives)} />`);
        ownPower = p.unary_prefix + 1;
      }

      if (ownPower > power) yield fail();

      yield defineAttribute('position', pre ? 'prefix' : 'suffix');
    }

    *BinaryExpression({ props: { op, power, noIn } }) {
      let { powers: p } = this.constructor;
      yield eatHeld(m`left+$: <_Expression />`, o({ power: power - 1 }));

      let matcherCache = binaryExpressionMatchers;
      let pattern = matcherCache.get(power);

      if (!op) {
        op = printSource(yield match(buildPattern(getBinaryOperatorAlternatives(p, power))));
      }

      pattern ??= buildPattern(getBinaryOperatorAlternatives(p, power));

      matcherCache.set(power, pattern);

      yield eat(
        m`sigilToken*: <*${['instanceof', 'in'].includes(op) ? keyword : null} ${pattern} />`,
      );

      if (op === 'in' && noIn) yield fail();

      let ownPower = getBinaryOperatorPower(p, op);

      yield eat(m`right+$: <_Expression />`, o({ power: ownPower - 1 }));
    }

    *AssignmentExpression() {
      let { powers: p } = this.constructor;
      yield eatHeld(m`left+$: <_Expression />`, o({ power: p.access }));
      assignmentMatcher ??= m`assignmentOperator*: <* ${buildPattern(
        assignmentOperatorAlternatives,
      )} />`;
      yield eat(assignmentMatcher);
      yield eat(m`right+$: <_Expression />`, o({ power: p.assign }));
    }

    *MemberExpression() {
      let { powers: p } = this.constructor;
      yield eatHeld(m`object+$: <_Expression />`, o({ power: p.access }));
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
      let { powers: p } = this.constructor;
      yield startSpan('Bare', '?');
      yield eatHeld(m`test+$: <_Expression />`, o({ power: p.assign }));
      yield endSpan();

      yield eat(m`consequentSigilToken*: <* '?' />`);

      yield startSpan('Bare', ':');
      yield eat(m`consequent+$: <_Expression />`, o({ power: p.assign }));
      yield endSpan();

      yield eat(m`alternateSigilToken*: <* ':' />`);

      yield eat(m`alternate+$: <_Expression />`, o({ power: p.assign }));
    }

    *SequenceExpression() {
      yield startSubspan(null, ',');
      yield eatHeld(m`elements[]+$: <_Expression />`);
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
