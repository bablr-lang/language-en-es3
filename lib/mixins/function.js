import { freezeClass } from '@bablr/agast-helpers/object';
import { get } from '@bablr/agast-helpers/path';
import { m, o, eat, eatMatch, endSpan, fail, match, startSpan } from '@bablr/helpers/grammar';
import { startsIdentifierPattern } from '../util.js';

const mixin = (Base) => {
  class ES3FunctionGrammar extends Base {
    *CallExpression() {
      yield eat(m`callee+$: <_Expression />`, o({}), o({ held: 'eat' }));

      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield startSpan('Bare', ')');
      let arg = true;
      while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
        arg = yield eat(m`arguments[]+$: <Argument />`);
      }
      if (arg && get('separatorToken', arg.node)) yield fail();
      yield endSpan();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
    }

    *NewExpression({ props: { power } }) {
      let { powers } = this.constructor.context;
      yield eat(m`sigilToken*: <*Keyword 'new' />`);
      yield eat(m`callee+$: <_Expression />`, o({ power: powers.new }));
      let p = yield power >= powers.new
        ? eatMatch(m`openArgumentsToken*: <* '(' />`)
        : eat(m`openArgumentsToken*: <* '(' />`);
      if (p) {
        yield startSpan('Bare', ')');
        let arg = true;
        while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
          arg = yield eat(m`arguments[]+$: <Argument />`);
        }
        if (arg && get('separatorToken', arg.node)) yield fail();
        yield endSpan();
        yield eat(m`closeArgumentsToken*: <* ')' />`);
      }
    }

    *Argument() {
      yield eat(m`value+: <_Expression />`);
      yield eatMatch(m`separatorToken*: <* ',' />`);
    }

    *FunctionExpression() {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield eatMatch(m`name$: <*Identifier ${startsIdentifierPattern} />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      let arg = true;
      while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
        arg = yield eat(m`arguments[]+$: <Parameter />`);
      }
      if (arg && get('separatorToken', arg.node)) yield fail();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
      yield eat(m`body$: <Block />`);
    }

    *Parameter() {
      yield eat(m`value+: <_Expression />`);
      yield eatMatch(m`separatorToken*: <* ',' />`);
    }

    *ThisExpression() {
      yield eat(m`sigilToken*: <*Keyword 'this' />`);
    }
  }

  freezeClass(ES3FunctionGrammar);

  return ES3FunctionGrammar;
};

export default mixin;
