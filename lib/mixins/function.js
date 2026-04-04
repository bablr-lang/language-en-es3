import { get } from '@bablr/agast-helpers/path';
import { m } from '@bablr/boot';
import { eat, eatMatch, endSpan, fail, match, o, startSpan } from '@bablr/helpers/grammar';

const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    *CallExpression() {
      yield eat(m`callee+$: <_Expression />`, o({}), o({ held: 'eat' }));

      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield startSpan('Bare', ')');
      let arg = true;
      while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
        arg = yield eat(m`arguments[]+$: <CallArgument />`);
      }
      if (arg && get('separatorToken', arg.node)) yield fail();
      yield endSpan();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
    }

    *NewExpression({ props: { power } }) {
      let { powers } = this.constructor;
      yield eat(m`sigilToken*: <*Keyword 'new' />`);
      yield eat(m`callee+$: <_Expression />`, o({ power: powers.new }));
      let p = yield power >= powers.new
        ? eatMatch(m`openArgumentsToken*: <* '(' />`)
        : eat(m`openArgumentsToken*: <* '(' />`);
      if (p) {
        yield startSpan('Bare', ')');
        let arg = true;
        while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
          arg = yield eat(m`arguments[]+$: <CallArgument />`);
        }
        if (arg && get('separatorToken', arg.node)) yield fail();
        yield endSpan();
        yield eat(m`closeArgumentsToken*: <* ')' />`);
      }
    }

    *CallArgument() {
      yield eat(m`value+: <_Expression />`);
      yield eatMatch(m`separatorToken*: <* ',' />`);
    }

    *FunctionExpression() {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield eatMatch(m`name$: <Identifier />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      let arg = true;
      while ((arg === true || get('separatorToken', arg.node)) && !(yield match(m`/$/`))) {
        arg = yield eat(m`arguments[]+$: <Argument />`);
      }
      if (arg && get('separatorToken', arg.node)) yield fail();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
      yield eat(m`body$: <Block />`);
    }

    *Argument() {
      yield eat(m`value+: <_Expression />`);
      yield eatMatch(m`separatorToken*: <* ',' />`);
    }

    *ThisExpression() {
      yield eat(m`sigilToken*: <*Keyword 'this' />`);
    }
  };

export default mixin;
