import { i } from '@bablr/boot';
import { Node } from '@bablr/helpers/decorators';

export const mixin = (Base) =>
  class ES3FunctionGrammar extends Base {
    @Node
    *FunctionDeclaration() {
      yield i`eat(<*Keyword 'function' /> 'sigilToken')`;
      yield i`eat(<*Identifier /> 'id')`;
      yield i`eat(<*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'params[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <*Punctuator ',' />
      })`;
      yield i`eat(<*Punctuator ')' balancer /> 'closeArgumentsToken')`;
      yield i`eat(<BlockStatement /> 'body')`;
    }

    @Node
    *FunctionExpression() {
      yield i`eat(<*Keyword 'function' /> 'sigilToken')`;
      yield i`eatMatch(<*Identifier /> 'id')`;
      yield i`eat(<*Punctuator '(' balanced=')' /> 'openParamsToken')`;
      yield i`eat(<List /> 'params[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <*Punctuator ',' />
      })`;
      yield i`eat(<*Punctuator ')' balancer /> 'closeParamsToken')`;
      yield i`eat(<BlockStatement /> 'body')`;
    }

    @Node
    *CallExpression() {
      yield i`eat(<Expression /> 'callee')`;
      yield i`eat(<*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'arguments[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <*Punctuator ',' />
      })`;
      yield i`eat(<*Punctuator ')' balancer /> 'closeArgumentsToken')`;
    }

    @Node
    *NewExpression() {
      yield i`eat(<*Keyword /> 'sigilToken')`;
      yield i`eat(<Expression /> 'callee')`;
      yield i`eat(<*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'arguments[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <*Punctuator ',' />
      })`;
      yield i`eat(<*Punctuator ')' balancer /> 'closeArgumentsToken')`;
    }

    @Node
    *ReturnStatement() {
      yield i`eat(<*Keyword 'return' /> 'sigilToken')`;
      yield i`eatMatch(<Expression /> 'argument')`;
    }

    @Node
    *ThrowStatement() {
      yield i`eat(<*Keyword 'throw' /> 'sigilToken')`;
      yield i`eat(<Expression /> 'argument')`;
    }
  };
