import {
  eat,
  eatMatch,
  m,
  o,
  r,
  shiftMatch,
  fail,
  match,
  startSpan,
  endSpan,
} from '@bablr/helpers/grammar';
import * as productions from '@bablr/helpers/productions';
import { triviaEnhancer as triviaEnhancer } from '@bablr/helpers/trivia';
import Space from '@bablr/language-en-blank-space';
import Comment from '@bablr/language-en-c-comments';
import functionMixin from './mixins/function.js';
import jsonMixin from './mixins/json.js';
import statementMixin from './mixins/statement.js';
import { default as logicMixin, unaryPrefixOperatorAlternatives } from './mixins/logic.js';
import Regex from './regex.js';
import { buildPattern, buildString } from '@bablr/helpers/builders';
import { printSource } from '@bablr/agast-helpers/tree';
import * as BMap from '@bablr/agast-helpers/b-map';
import * as BSet from '@bablr/agast-helpers/b-set';
import { buildEmbeddedMatcher } from '@bablr/agast-vm-helpers/builders';

export {
  assignmentOperators,
  assignmentOperatorAlternatives,
  unaryPrefixOperators,
  unaryPrefixOperatorAlternatives,
  unaryPostfixOperators,
  unaryPostfixOperatorAlternatives,
  getBinaryOperatorAlternatives,
} from './mixins/logic.js';

let { freeze } = Object;

export const reservedWords = freeze([
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

class ES3Base {
  static canonicalURL = 'https://bablr.org/languages/universe/en/es3';
  static dependencies = freeze({ Regex, Comment, Space });
  static defaultMatcher = m`_+: <_Expression />`;
  static fragmentProduction = 'Fragment';
  static context = freeze({});
}

freeze(ES3Base);
freeze(ES3Base.prototype);

class ES3Atrivial extends functionMixin(jsonMixin(statementMixin(logicMixin(ES3Base)))) {
  constructor() {
    super();
    this.emptyables = BSet.concat(
      this.emptyables || BSet.create(),
      BSet.from('Program', 'List', 'Trivia'),
    );
  }

  *Fragment({ props: { rootMatcher } }) {
    yield eat(rootMatcher);
  }

  *Program() {
    yield eat(m`body[]$: <__StatementList />`);
  }

  *Expression({ props: { power, noIn = false }, s }) {
    let { powers } = this.constructor.context;
    let power_ = power || powers.comma;
    let res;
    if (!s().shifted) {
      if ((res = yield eatMatch(m`<ParenthesisExpression '(' />`))) {
      } else if ((res = yield eatMatch(m`<_JSONExpression />`))) {
      } else if ((res = yield eatMatch(m`:Regex: <Pattern '/' />`, o({}), o({ held: 'eat' })))) {
      } else if ((res = yield eatMatch(m`<ThisExpression 'this' />`))) {
      } else if ((res = yield eatMatch(m`<FunctionExpression 'function' />`))) {
      } else if (
        power_ >= powers.unary_prefix &&
        (res = yield eatMatch(
          m`<UnaryExpression ${buildPattern(unaryPrefixOperatorAlternatives)} />`,
        ))
      ) {
      } else if (
        power_ >= powers.new &&
        (res = yield eatMatch(m`<NewExpression 'new' />`, o({ power: power_ })))
      ) {
      } else if ((res = yield eatMatch(m`<*Identifier />`))) {
      }
    } else {
      res = yield eat(m`<_LogicExpression />`, o({ power: power_, noIn }));
    }
    if (res && !(yield match(m`/$/`))) {
      // TODO get the power-specific guard so this can not-branch
      return r(shiftMatch(m`<_Expression />`, o({ power: power_ })));
    }
  }

  *ParenthesisExpression() {
    yield eat(m`openToken*: <* '(' />`);
    yield startSpan('Bare', ')');
    yield eat(m`expression+$: <_Expression />`);
    yield endSpan();
    yield eat(m`closeToken*: <* ')' />`);
  }

  *Identifier({ props: { scoped = true } }) {
    let id = printSource(yield eat(m`/[a-zA-Z_$][a-zA-Z\d_$]*/`));
    if (scoped && reservedWords_.has(id)) yield fail();
  }

  *Keyword({ literalValue, s }) {
    if (!literalValue) throw new Error('Intrinsic productions must have value');

    yield eat(buildEmbeddedMatcher(buildString(printSource(literalValue))));

    if (s().span.name !== 'Escape') {
      if (!(yield match(m`/[ \n\r\t]|\/\/|\/\*|$|[*&^%$#@!?(){}[\].,/\\'";:=+|\u0061~-]/`))) {
        yield fail();
      }
    }
  }

  All(args) {
    return productions.All(args);
  }

  *Trivia() {
    while (
      (yield eatMatch(m`.: :Space: <_Blank /[ \n\r\t]+/ />`)) ||
      (yield eatMatch(m`.: :Comment: <_Comment /\/\/|\/\*/ />`))
    );
  }
}

freeze(ES3Atrivial);
freeze(ES3Atrivial.prototype);

export default triviaEnhancer(
  {
    triviaIsAllowed: (s) => s.span.name === 'Bare',

    *Trivia({ s }) {
      let span = BMap.get('Trivia', s().spans);

      let spaces = span?.props.spaces ?? Infinity;

      yield startSpan('Trivia', null, span?.props);
      let res = yield match(m`/\/\/|\/\*|[ \t][^ \t\r\n\g]|[ \n\r\t]/`);

      if (res) {
        res = printSource(res);
      }

      if (res && ' \t'.includes(res[0]) && res.length === 2 && spaces > 1) {
        yield eat(m`#: <* ' ' />`, o({}), o({ hold: true }));
      } else {
        yield eat(m`#: <Trivia />`, o({}), o({ hold: true }));
      }
      yield endSpan();
    },
  },
  ES3Atrivial,
);
