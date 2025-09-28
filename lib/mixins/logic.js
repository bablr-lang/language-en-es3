import { getRoot } from '@bablr/agast-helpers/tree';
import {
  buildAlternative,
  buildAlternatives,
  buildElements,
  buildPattern,
  buildRegexGroup,
} from '@bablr/helpers/builders';
import { spam as m, buildTag, re } from '@bablr/boot';
import * as regexLang from '@bablr/boot/languages/regex';
import { defineAttribute, eat, eatMatch, fail, match, o } from '@bablr/helpers/grammar';
import { buildEmbeddedRegex } from '@bablr/agast-vm-helpers/builders';

let { freeze } = Object;

export const reTok_ = buildTag(regexLang, 'Pattern');

export const reTok = new Proxy(reTok_, {
  apply(tag, _, args) {
    return buildEmbeddedRegex(tag(...args));
  },
});

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
  '\\': reTok.Character`\\`,
  '/': reTok.Character`\/`,
  '(': reTok.Character`\(`,
  ')': reTok.Character`\)`,
  '{': reTok.Character`\{`,
  '}': reTok.Character`\}`,
  '+': reTok.Character`\+`,
  '*': reTok.Character`\*`,
  '<': reTok.Character`\<`,
  '>': reTok.Character`\>`,
  '^': reTok.Character`\^`,
  '|': reTok.Character`\|`,
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
                  reTok.Character({
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

export const mixin = (Base) =>
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

    *LogicExpression({ ctx, props: { power = 34, noIn = false } }) {
      let op = yield match(
        re`/\g(?:[[.(?,]|${buildRegexGroup(unaryPostfixOperatorAlternatives)}|${buildRegexGroup(
          getBinaryOperatorAlternatives(power),
        )}|${buildRegexGroup(assignmentOperatorAlternatives)})/`,
      );

      if (!op) return;

      op = op.children[1][1].value;

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
      if (!s.holding) {
        yield eatMatch(m`argument+$: null`);
        op = yield eatMatch(
          m`sigilToken: <*Punctuator ${buildPattern(unaryPrefixOperatorAlternatives)} />`,
        );
      }
      if (op) ownPower = 10;
      yield eat(m`argument+$: <_Expression />`, o({ power: ownPower - 2 }));

      if (!op) {
        yield eat(m`sigilToken: <*Punctuator ${buildPattern(unaryPostfixOperatorAlternatives)} />`);
        ownPower = 12;
      }

      if (ownPower > power) yield fail();

      yield defineAttribute('power', ownPower);
      yield defineAttribute('position', op ? 'prefix' : 'suffix');
    }

    *BinaryExpression({ props: { power, noIn }, ctx }) {
      yield eat(m`left+$: <_Expression />`, o({ power: power - 2 }));

      let op = yield eat(
        m`sigilToken: <*Punctuator ${buildPattern(getBinaryOperatorAlternatives(power))} />`,
      );

      let opTxt = ctx.sourceTextFor(op).trim();

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
      yield eat(
        m`assignmentOperator: <*Punctuator ${buildPattern(assignmentOperatorAlternatives)} />`,
      );
      yield eat(m`right+$: <_Expression />`, o({ power: 32 }));
    }

    *MemberExpression({ ctx }) {
      yield eat(m`object+$: <_Expression />`, o({ power: 2 }));
      yield defineAttribute('power', 2);
      let sigil = yield match(re`/[[.]/`);
      switch (ctx.sourceTextFor(sigil)) {
        case '.': {
          yield eat(m`dotToken: <*Punctuator '.' />`);
          yield eat(m`openToken: null`);
          yield eat(m`property+$: <Identifier />`, o({ scoped: false }));
          yield eat(m`closeToken: null`);
          break;
        }

        case '[': {
          yield eat(m`dotToken: null`);
          yield eat(m`openToken: <*Punctuator '[' { balanced: ']' } />`);
          yield eat(m`property+$: <_Expression />`);
          yield eat(m`closeToken: <*Punctuator ']' { balancer: true } />`);
          break;
        }

        default:
          yield fail();
      }
    }

    *TernaryExpression() {
      yield eat(m`test+$: <_Expression />`, o({ power: 32 }));
      yield defineAttribute('power', 32);

      yield eat(m`consequentSigilToken: <*Punctuator '?' />`);
      yield eat(m`consequent+$: <_Expression />`, o({ power: 32 }));
      yield eat(m`alternateSigilToken: <*Punctuator ':' />`);
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
      } while (yield eatMatch(m`#separatorTokens[]: <*Punctuator ',' />`));
      if (count === 1) yield fail();
    }
  };
