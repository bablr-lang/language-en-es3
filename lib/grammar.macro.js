import { i } from '@bablr/boot';
import { Node, InjectFrom } from '@bablr/helpers/decorators';
import { triviaEnhancer } from '@bablr/helpers/trivia';
import * as productions from '@bablr/helpers/productions';
import * as Comment from '@bablr/language-en-c-comments';
import { mixin as functionMixin } from './mixins/function.js';
import { mixin as jsonMixin } from './mixins/json.js';
import { mixin as statementMixin } from './mixins/statement.js';
import { mixin as variablesMixin } from './mixins/variables.js';
import { mixin as logicMixin } from './mixins/logic.js';
import * as Regex from './regex.js';

export const dependencies = { Regex, Comment };

export const canonicalURL = 'https://bablr.org/languages/universe/es3';

export const atrivialGrammar = class ES3Grammar extends functionMixin(
  jsonMixin(statementMixin(variablesMixin(logicMixin(Object)))),
) {
  @Node
  @InjectFrom(productions)
  *Keyword() {}

  @Node
  @InjectFrom(productions)
  *Punctuator() {}

  @InjectFrom(productions)
  *Any() {}
};

export const grammar = triviaEnhancer(
  {
    triviaIsAllowed: (s) => s.span === 'Bare',
    *eatMatchTrivia() {
      if (yield i`match(/[ \n\r\t]|\/\/|\/\*/)`) {
        yield i`eat(<#*Comment:Trivia />)`;
      }
    },
  },
  atrivialGrammar,
);
