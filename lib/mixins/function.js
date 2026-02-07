import { spam as m, re } from '@bablr/boot';
import { eat, eatHeld, eatMatch, endSpan, fail, match, o, startSpan } from '@bablr/helpers/grammar';

const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    *CallExpression() {
      yield eatHeld(m`callee+$: <_Expression />`);

      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield startSpan('Bare', ')');
      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield eat(m`arguments[]+$: <_Element />`);
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      if (sep && sep !== true) yield fail();
      yield endSpan();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
    }

    *FunctionExpression() {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield eatMatch(m`name$: <Identifier />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield eat(m`params[]+$: <Identifier />`);
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      if (sep && sep !== true) yield fail();
      yield eat(m`closeArgumentsToken*: <* ')' />`);
      yield eat(m`body$: <Block />`);
    }

    *ThisExpression() {
      yield eat(m`sigilToken*: <*Keyword 'this' />`);
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
        let sep = true;
        while (sep && !(yield match(re`/$/`))) {
          yield eat(m`arguments[]+$: <_Element />`);
          sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
        }
        if (sep && sep !== true) yield fail();
        yield endSpan();
        yield eat(m`closeArgumentsToken*: <* ')' />`);
      }
    }
  };

export default mixin;
