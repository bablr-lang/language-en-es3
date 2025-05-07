import { spam as m } from '@bablr/boot';
import { Node, InjectFrom, AllowEmpty, CoveredBy } from '@bablr/helpers/decorators';
import { eat, eatMatch, o, holdForMatch, fail } from '@bablr/helpers/grammar';
import { triviaEnhancer } from '@bablr/helpers/trivia';
import * as productions from '@bablr/helpers/productions';
import * as Comment from '@bablr/language-en-c-comments';
import { mixin as functionMixin } from './mixins/function.js';
import { mixin as jsonMixin } from './mixins/json.js';
import { mixin as statementMixin } from './mixins/statement.js';
import { mixin as logicMixin } from './mixins/logic.js';
import * as Regex from './regex.js';

export const dependencies = { Regex, Comment };

export const canonicalURL = 'https://bablr.org/languages/universe/es3';

let reservedWords = new Set([
  'abstract',
  'arguments',
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

export const atrivialGrammar = class ES3Grammar extends functionMixin(
  jsonMixin(statementMixin(logicMixin(Object))),
) {
  *[Symbol.for('@bablr/fragment')]({ props: { rootMatcher } }) {
    // needed for the trivia plugin
    yield eat(rootMatcher);
  }

  @AllowEmpty
  @Node
  *Program() {
    yield eat(m`body[]: <_StatementList />`);
  }

  *Expression({ props: { power = 34 }, s }) {
    let res;
    if (!s.holding) {
      if ((res = yield eatMatch(m`<_JSONExpression />`))) {
      } else if (
        power >= 4 &&
        (res = yield eatMatch(m`<UnaryExpression /typeof|\+\+|--|\+|-|void|delete|!/ />`))
      ) {
      } else if (power >= 4 && (res = yield eatMatch(m`<NewExpression 'new' />`, o({ power })))) {
      } else if ((res = yield eatMatch(m`<Identifier />`))) {
      }
    } else {
      res = yield eatMatch(m`<_LogicExpression />`, o({ power }));
    }
    if (res) {
      return holdForMatch(m`<__Expression />`, o({ power }));
    }
  }

  @CoveredBy('Expression')
  @Node
  *Identifier({ ctx }) {
    let id = ctx.sourceTextFor(yield eat(m`value: <*Literal /[a-zA-Z_$][a-zA-Z\d_$]*/ />`));
    if (reservedWords.has(id)) yield fail();
  }

  @AllowEmpty
  @InjectFrom(productions)
  *List() {}

  @Node
  @InjectFrom(productions)
  *Keyword() {}

  @Node
  @InjectFrom(productions)
  *Literal() {}

  @Node
  @InjectFrom(productions)
  *Punctuator() {}

  @InjectFrom(productions)
  *Any() {}

  @InjectFrom(productions)
  *All() {}

  @AllowEmpty
  @InjectFrom(productions)
  *Optional() {}
};

export const grammar = triviaEnhancer(
  {
    triviaIsAllowed: (s) => s.span === 'Bare',
    triviaMatcher: m`#: <_Comment:Trivia /[ \n\r\t]|\/\/|\/\*/ />`,
  },
  atrivialGrammar,
);
