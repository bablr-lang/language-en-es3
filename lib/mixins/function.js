import { spam as m } from '@bablr/boot';
import { List } from '@bablr/helpers/productions';
import { eat, eatHeld, eatMatch, o } from '@bablr/helpers/grammar';

const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    *CallExpression() {
      yield eatHeld(m`callee+$: <_Expression />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield* List({
        element: m`arguments[]+$: <_Element />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens: <* ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <* ')' />`);
    }

    *FunctionExpression() {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield eatMatch(m`name$: <Identifier />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield* List({
        element: m`params[]+$: <Identifier />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens: <* ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <* ')' />`);
      yield eat(m`body$: <Block />`);
    }

    *ThisExpression() {
      yield eat(m`sigilToken*: <*Keyword 'this' />`);
    }

    *NewExpression({ props: { power } }) {
      yield eat(m`sigilToken*: <*Keyword 'new' />`);
      yield eat(m`callee+$: <_Expression />`, o({ power: 4 }));
      let p = yield power >= 4
        ? eatMatch(m`openArgumentsToken*: <* '(' />`)
        : eat(m`openArgumentsToken*: <* '(' />`);
      if (p) {
        yield* List({
          element: [m`arguments[]+$: <_Expression />`, o({ power: 32 })],
          allowTrailingSeparator: false,
          separator: m`#separatorTokens: <* ',' />`,
        });
        yield eat(m`closeArgumentsToken*: <* ')' />`);
      }
    }
  };

export default mixin;
