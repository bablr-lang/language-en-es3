import { getRoot, printSource } from '@bablr/agast-helpers/tree';
import { printSource as printStreamSource } from '@bablr/agast-helpers/stream';
import { writePattern, writeRegexGroup } from '@bablr/helpers/builders';
import {
  m,
  o,
  defineAttribute,
  eat,
  eatMatch,
  startSpan,
  endSpan,
  fail,
  match,
  startSubspan,
} from '@bablr/helpers/grammar';
import * as BMap from '@bablr/agast-helpers/b-map';
import { freezeClass, freezeRecord } from '@bablr/agast-helpers/object';
import { arrayValues, flatMap } from '@bablr/agast-helpers/iterable';

let { entry } = BMap;
let { includes, slice } = Array.prototype;

const buildOperatorAlternatives = (categories) =>
  freezeRecord([...flatMap((operators) => arrayValues(operators), arrayValues(categories))]);

export const assignmentOperators = freezeRecord([
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

export const unaryPrefixOperators = freezeRecord([
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

export const unaryPostfixOperators = freezeRecord(['++', '--']);
export const unaryPostfixOperatorAlternatives = buildOperatorAlternatives([unaryPostfixOperators]);

const binaryExpressionPowerRank = freezeRecord([
  freezeRecord(['||']),
  freezeRecord(['&&']),
  freezeRecord(['|']),
  freezeRecord(['^']),
  freezeRecord(['&']),
  freezeRecord(['===', '==', '!==', '!=']),
  freezeRecord(['<=', '<', '>=', '>', 'instanceof', 'in']),
  freezeRecord(['>>>', '<<', '>>']),
  freezeRecord(['+', '-']),
  freezeRecord(['%', '*', '/']),
]);

export const getBinaryOperatorAlternatives = (powers, power) => {
  return buildOperatorAlternatives(
    Array.prototype.slice.call(binaryExpressionPowerRank, Math.max(0, powers.logical_or - power)),
  );
};

const getBinaryOperatorPower = (p, str) => {
  let idx = Array.prototype.findIndex.call(binaryExpressionPowerRank, (arr) =>
    includes.call(arr, str),
  );
  return idx >= 0 ? p.logical_or - idx : null;
};

let assignmentMatcher;
let binaryExpressionMatchers = new Map();
let logicExpressionMatchers = new Map();

let powers = freezeRecord({
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

let assignables = freezeRecord(['MemberExpression', 'Identifier']);

const mixin = (Base) => {
  class ES3LogicGrammar extends Base {
    static context = freezeRecord({ ...super.context, assignables, powers });

    constructor() {
      super();

      this.attributes = BMap.concat(
        this.attributes || BMap.create(),
        BMap.from(entry('UnaryExpression', { position: undefined })),
      );
    }

    *LogicExpression({ language, s, props: { power, noIn = false } }) {
      let { shifted } = s();
      if (!shifted) return;
      let { powers: p } = this.constructor.context;

      let power_ = power || p.comma;

      let matcherCache = logicExpressionMatchers;
      let matcher = matcherCache.get(power_);

      matcher ??= m`/[[.(?,]|===?|${printStreamSource(
        writeRegexGroup(unaryPostfixOperatorAlternatives),
      )}|${printStreamSource(writeRegexGroup(assignmentOperatorAlternatives))}|${printStreamSource(
        writeRegexGroup(getBinaryOperatorAlternatives(p, power_)),
      )}/`;

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
      if (!res && power_ >= p.unary_postfix && includes.call(unaryPostfixOperators, op)) {
        res = yield eat(m`<UnaryExpression />`, o({ op, power: power_ }));
      }
      if (!res && power_ >= p.multiply) {
        for (let powerRank of slice.call(
          binaryExpressionPowerRank,
          Math.max(0, p.logical_or - power_),
        )) {
          if (includes.call(powerRank, op)) {
            res = yield eat(m`<BinaryExpression />`, o({ op, power: power_, noIn }));
          }
        }
      }
      if (!res && power_ >= p.assign) {
        if (
          includes.call(language.context.assignables, getRoot(shifted).value.name.description) &&
          includes.call(assignmentOperators, op) &&
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
      let { powers: p } = this.constructor.context;
      let ownPower = 0;
      let pre;
      if (!s().shifted) {
        pre = yield eat(
          m`sigilToken*: <*${op && /[a-z]/.test(op[0]) ? 'Keyword' : ''} ${printStreamSource(
            writePattern(unaryPrefixOperatorAlternatives),
          )} />`,
        );
      }
      if (pre) {
        ownPower = p.unary_postfix + 1;
      }

      yield eat(m`argument+$: <_Expression />`, o({}), o({ held: !pre ? 'eat' : null }));

      if (!pre) {
        yield eat(
          m`sigilToken*: <* ${printStreamSource(
            writePattern(unaryPostfixOperatorAlternatives),
          )} />`,
        );
        ownPower = p.unary_prefix + 1;
      }

      if (ownPower > power) yield fail();

      yield defineAttribute('position', pre ? 'prefix' : 'suffix');
    }

    *BinaryExpression({ props: { op, power, noIn } }) {
      let { powers: p } = this.constructor.context;
      yield eat(m`left+$: <_Expression />`, o({ power: power - 1 }), o({ held: 'eat' }));

      let matcherCache = binaryExpressionMatchers;
      let pattern = matcherCache.get(power);

      if (!op) {
        op = printSource(
          yield match(printStreamSource(writePattern(getBinaryOperatorAlternatives(p, power)))),
        );
      }

      pattern ??= printStreamSource(writePattern(getBinaryOperatorAlternatives(p, power)));

      matcherCache.set(power, pattern);

      yield eat(
        m`sigilToken*: <*${['instanceof', 'in'].includes(op) ? 'Keyword' : ''} ${pattern} />`,
      );

      if (op === 'in' && noIn) yield fail();

      let ownPower = getBinaryOperatorPower(p, op);

      yield eat(m`right+$: <_Expression />`, o({ power: ownPower - 1 }));
    }

    *AssignmentExpression() {
      let { powers: p } = this.constructor.context;
      yield eat(m`left+$: <_Expression />`, o({ power: p.access }), o({ held: 'eat' }));
      assignmentMatcher ??= m`assignmentOperator*: <* ${printStreamSource(
        writePattern(assignmentOperatorAlternatives),
      )} />`;
      yield eat(assignmentMatcher);
      yield eat(m`right+$: <_Expression />`, o({ power: p.assign }));
    }

    *MemberExpression() {
      let { powers: p } = this.constructor.context;
      yield eat(m`object+$: <_Expression />`, o({ power: p.access }), o({ held: 'eat' }));
      let sigil = yield match(m`/[[.]/`);
      switch (printSource(sigil)) {
        case '.': {
          yield eat(m`dotToken*: <* '.' />`);
          yield eat(m`property+$: <*Identifier />`, o({ scoped: false }));
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
      let { powers: p } = this.constructor.context;
      yield startSpan('Bare', '?');
      yield eat(m`test+$: <_Expression />`, o({ power: p.assign }), o({ held: 'eat' }));
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
      yield eat(m`elements[]+$: <_Expression />`, o({}), o({ held: 'eat' }));
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
  }

  freezeClass(ES3LogicGrammar);

  return ES3LogicGrammar;
};

export default mixin;
