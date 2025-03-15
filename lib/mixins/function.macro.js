import { spam as m } from '@bablr/boot';
import { bindAttribute, eat, eatMatch, o } from '@bablr/helpers/grammar';
import { CoveredBy, Node, UnboundAttributes } from '@bablr/helpers/decorators';

export const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    @Node
    *FunctionExpression() {
      yield eat(m`sigilToken: <*Keyword 'function' />`);
      yield eatMatch(m`id: <*Identifier />`);
      yield eat(m`openParamsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`params[]: <List />`,
        o({
          element: m`<*Identifier />`,
          allowTrailingSeparator: false,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeParamsToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <BlockStatement />`);
    }

    @UnboundAttributes(['power'])
    @CoveredBy('Expression')
    @Node
    *CallExpression() {
      yield bindAttribute('power', 6);
      yield eat(m`callee+$: <Expression />`, o({ power: 4 }));
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`arguments[]+: <List />`,
        o({
          element: m`<*Identifier />`,
          allowTrailingSeparator: false,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
    }

    @UnboundAttributes(['power'])
    @CoveredBy('Expression')
    @Node
    *NewExpression({ value: props }) {
      const { power } = props?.value || {};

      yield eat(m`sigilToken: <*Keyword 'new' />`);
      yield eat(m`callee+$: <Expression />`, o({ power: 4 }));
      let p = yield power >= 4
        ? eatMatch(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`)
        : eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      if (p) {
        yield eat(
          m`arguments[]: <List />`,
          o({
            element: m`<*Identifier />`,
            allowTrailingSeparator: false,
            separator: m`separatorTokens[]: <*Punctuator ',' />`,
          }),
        );
        yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
        yield bindAttribute('power', 2);
      } else {
        yield eat(m`arguments[]: []`);
        yield eat(m`separatorTokens[]: []`);
        yield eat(m`closeArgumentsToken: null`);
        yield bindAttribute('power', 4);
      }
    }
  };
