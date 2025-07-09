import { spam as m } from '@bablr/boot';
import { defineAttribute, eat, eatMatch, o } from '@bablr/helpers/grammar';
import { CoveredBy, Node, UndefinedAttributes } from '@bablr/helpers/decorators';

export const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    @UndefinedAttributes(['power'])
    @CoveredBy('Expression')
    @Node
    *CallExpression() {
      yield eat(m`callee+$: <_Expression />`, o({ power: 4 }));
      yield defineAttribute('power', 6);
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`arguments[]+$: <__List />`,
        o({
          element: [m`<_Expression />`, o({ power: 32 })],
          allowTrailingSeparator: false,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
    }

    @CoveredBy('Expression')
    @Node
    *FunctionExpression() {
      yield eat(m`sigilToken: <*Keyword 'function' />`);
      yield eatMatch(m`id: <Identifier />`);
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`params[]: <__List />`,
        o({
          element: m`<Identifier />`,
          allowTrailingSeparator: false,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <BlockStatement />`);
    }

    @UndefinedAttributes(['power'])
    @CoveredBy('Expression')
    @Node
    *NewExpression({ props: { power } }) {
      yield eat(m`sigilToken: <*Keyword 'new' />`);
      yield eat(m`callee+$: <_Expression />`, o({ power: 4 }));
      let p = yield power >= 4
        ? eatMatch(
            m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`,
            o({}),
            o({ bind: true }),
          )
        : eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      if (p) {
        yield eat(
          m`arguments[]+$: <__List />`,
          o({
            element: [m`<_Expression />`, o({ power: 32 })],
            allowTrailingSeparator: false,
            separator: m`#separatorTokens[]: <*Punctuator ',' />`,
          }),
        );
        yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
        yield defineAttribute('power', 2);
      } else {
        yield eat(m`arguments[]: []`);
        yield eat(m`#separatorTokens[]: []`);
        yield eat(m`closeArgumentsToken: null`);
        yield defineAttribute('power', 4);
      }
    }
  };
