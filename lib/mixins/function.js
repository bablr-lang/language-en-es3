import { spam as m } from '@bablr/boot';
import { List } from '@bablr/helpers/productions';
import { defineAttribute, eat, eatMatch, o } from '@bablr/helpers/grammar';

const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    constructor() {
      super();

      this.attributes = new Map([
        ...(this.attributes || []),
        ...Object.entries({
          CallExpression: { power: undefined },
          NewExpression: { power: undefined },
        }),
      ]);
    }

    *CallExpression() {
      yield eat(m`callee+$: <_Expression />`, o({ power: 4 }));
      yield defineAttribute('power', 6);
      yield eat(m`openArgumentsToken*: <*Punctuator '(' { balanced: ')' } />`);
      yield* List({
        element: m`arguments[]+$: <_Element />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens[]: <*Punctuator ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <*Punctuator ')' { balancer: true } />`);
    }

    *FunctionExpression() {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield eatMatch(m`id$: <Identifier />`);
      yield eat(m`openArgumentsToken*: <*Punctuator '(' { balanced: ')' } />`);
      yield* List({
        element: m`params[]+$: <Identifier />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens[]: <*Punctuator ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body$: <BlockStatement />`);
    }

    *ThisExpression() {
      yield eat(m`sigilToken*: <*Keyword 'this' />`);
    }

    *NewExpression({ props: { power } }) {
      yield eat(m`sigilToken*: <*Keyword 'new' />`);
      yield eat(m`callee+$: <_Expression />`, o({ power: 4 }));
      let p = yield power >= 4
        ? eatMatch(
            m`openArgumentsToken*: <*Punctuator '(' { balanced: ')' } />`,
            o({}),
            o({ bind: true }),
          )
        : eat(m`openArgumentsToken*: <*Punctuator '(' { balanced: ')' } />`);
      if (p) {
        yield* List({
          element: [m`arguments[]+$: <_Expression />`, o({ power: 32 })],
          allowTrailingSeparator: false,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
        });
        yield eat(m`closeArgumentsToken*: <*Punctuator ')' { balancer: true } />`);
        yield defineAttribute('power', 2);
      } else {
        yield eat(m`closeArgumentsToken*: null`);
        yield defineAttribute('power', 4);
      }
    }
  };

export default mixin;
