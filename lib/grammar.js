import { spam as m, re } from '@bablr/boot';
import { eat, eatMatch, o, r, shiftMatch, fail, match } from '@bablr/helpers/grammar';
import * as productions from '@bablr/helpers/productions';
import { triviaEnhancer as triviaEnhancer } from '@bablr/helpers/trivia';
import Space from '@bablr/language-en-blank-space';
import Comment from '@bablr/language-en-c-comments';
import functionMixin from './mixins/function.js';
import jsonMixin from './mixins/json.js';
import statementMixin from './mixins/statement.js';
import { default as logicMixin, unaryPrefixOperatorAlternatives } from './mixins/logic.js';
import Regex from './regex.js';
import { buildPattern } from '@bablr/helpers/builders';
import { printSource } from '@bablr/agast-helpers/tree';

export {
  powerLevels,
  assignmentOperators,
  assignmentOperatorAlternatives,
  unaryPrefixOperators,
  unaryPrefixOperatorAlternatives,
  unaryPostfixOperators,
  unaryPostfixOperatorAlternatives,
  getBinaryOperatorAlternatives,
} from './mixins/logic.js';

export const dependencies = { Regex, Comment, Space };

export const canonicalURL = 'https://bablr.org/languages/universe/es3';

export const defaultMatcher = m`.+$: <_Expression />`;

export const reservedWords = Object.freeze([
  'abstract',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'double',
  'else',
  'eval',
  'false',
  'final',
  'finally',
  'float',
  'for',
  'function',
  'goto',
  'if',
  'implements',
  'in',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'volatile',
  'while',
  'with',
  'yield',
]);

let reservedWords_ = new Set(reservedWords);

const atrivial = class ES3Grammar extends functionMixin(
  jsonMixin(statementMixin(logicMixin(Object))),
) {
  constructor() {
    super();
    this.literals = new Set([...(this.literals || []), 'Literal']);
    this.emptyables = new Set([...(this.emptyables || []), 'Program', 'List']);
  }

  *Program() {
    yield eat(m`body[]$: <__StatementList />`);
  }

  *Expression({ props: { power = 34, noIn = false }, s }) {
    let res;
    if (!s().holding) {
      if ((res = yield eatMatch(m`<ParenthesisExpression '(' />`))) {
      } else if ((res = yield eatMatch(m`<_JSONExpression />`))) {
      } else if ((res = yield eatMatch(m`:Regex: <Pattern '/' />`))) {
      } else if ((res = yield eatMatch(m`<ThisExpression 'this' />`))) {
      } else if ((res = yield eatMatch(m`<FunctionExpression 'function' />`))) {
      } else if (
        power >= 4 &&
        (res = yield eatMatch(
          m`<UnaryExpression ${buildPattern(unaryPrefixOperatorAlternatives)} />`,
        ))
      ) {
      } else if (power >= 4 && (res = yield eatMatch(m`<NewExpression 'new' />`, o({ power })))) {
      } else if ((res = yield eatMatch(m`<Identifier />`))) {
      }
    } else {
      res = yield eat(m`<_LogicExpression />`, o({ power, noIn }));
    }
    if (res) {
      return r(shiftMatch(m`<_Expression />`, o({ power })));
    }
  }

  *ParenthesisExpression() {
    yield eat(m`openToken*: <* '(' />`);
    yield eat(m`expression+$: <_Expression />`);
    yield eat(m`closeToken*: <* ')' />`);
  }

  *Identifier({ props: { scoped = true } }) {
    let id = printSource((yield eat(m`value*: <*Literal /[a-zA-Z_$][a-zA-Z\d_$]*/ />`)).node);
    if (scoped && reservedWords_.has(id)) yield fail();
  }

  *Keyword({ literalValue, s }) {
    if (!literalValue) throw new Error('Intrinsic productions must have value');

    yield eat(printSource(literalValue));

    if (s().span !== 'Escape') {
      if (!(yield match(re`/[ \n\r\t]|\/\/|\/\*|$|[*&^%$#@!(){}[\].,/\\'";:=+|\u0061~-]/`))) {
        yield fail();
      }
    }
  }

  *Trivia() {
    while (
      (yield eatMatch(m`#: :Space: <*Space /[ \n\r\t]+/ />`, o({}), o({ literal: true }))) ||
      (yield eatMatch(m`#: :Comment: <_Comment /\/\/|\/\*/ />`))
    );
  }

  All(args) {
    return productions.All(args);
  }

  *Literal() {
    throw new Error('literal');
  }
};

export const grammar = triviaEnhancer(
  {
    triviaIsAllowed: (s) => s.span === 'Bare',
    triviaMatcher: m`#: <__Trivia /[ \n\r\t]|\/\/|\/\*/ />`,
  },
  atrivial,
);

export default { canonicalURL, dependencies, grammar, defaultMatcher };
